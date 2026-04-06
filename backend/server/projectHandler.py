import json
import os
import shutil
import tempfile
import zipfile
from typing import Dict, Iterator, List

import numpy as np
import torch
from PIL import Image

from .models.CoralSCOPModel import CoralSCOPModel
from .models.CoralTankModel import CoralTankModel
from .models.SAM3Model import SAM3Model
from .utils.logger import get_logger
from .utils.path import resolve_path

_logger = get_logger(__name__)


class ProjectHandler:

    def __init__(
        self,
        temp_folder: str,
        sam_model: SAM3Model,
        coralSCOP_model: CoralSCOPModel = None,
        coralTank_model: CoralTankModel = None,
    ):
        self.temp_folder = temp_folder
        self.sam3_model = sam_model
        self.coralSCOP_model = coralSCOP_model
        self.coralTank_model = coralTank_model

    def clean_up(self, token: str) -> None:
        zip_path = os.path.join(self.temp_folder, f"project_{token}.coral")
        if os.path.exists(zip_path):
            os.remove(zip_path)

        temp_dir = os.path.join(self.temp_folder, f"project_{token}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    def delete_project(self, token: str) -> None:
        self.clean_up(token)

    def get_zip_path(self, token: str) -> str:
        return os.path.join(self.temp_folder, f"project_{token}.coral")

    def run_coral_scop(self, image: Image.Image, config: Dict) -> Dict:
        image_npy = np.array(image)
        annotations = self.coralSCOP_model.gen_annotations(
            image_npy,
            min_area=config.get("min_area", 0.001),
            min_confidence=config.get("min_confidence", 0.5),
            max_iou=config.get("max_overlap", 0.001),
        )
        output_json = {
            "image": {
                "image_filename": "",
                "image_width": image.width,
                "image_height": image.height,
                "id": 0,
            },
            "annotations": annotations["annotations"],
            "categories": [{"id": 0, "name": "coral", "sub-categories": []}],
        }
        return output_json

    def run_coral_tank(self, image: Image.Image, config: Dict) -> Dict:
        masks, class_list = self.coralTank_model.predict(image)

        min_area = config.get("min_area", 0.001)
        image_area = image.width * image.height
        min_area_pixels = int(min_area * image_area)

        # Filter out masks that are smaller than the minimum area
        filtered_masks = []
        filtered_class_list = []
        for mask, cls in zip(masks, class_list):
            mask_area = mask["size"][0] * mask["size"][1]
            if mask_area >= min_area_pixels:
                filtered_masks.append(mask)
                filtered_class_list.append(cls)

        masks = filtered_masks
        class_list = filtered_class_list

        # Mask are the dictionary with keys "size" and "counts" for RLE
        output_json = {
            "image": {
                "image_filename": "",
                "image_width": image.width,
                "image_height": image.height,
                "id": 0,
            },
            "annotations": [
                {
                    "id": idx,
                    "category_id": class_list[idx],
                    "segmentation": mask,
                    "area": mask["size"][0] * mask["size"][1],
                    # Compute the bounding box
                    "bbox": [
                        0,
                        0,
                        mask["size"][1],
                        mask["size"][0],
                    ],  # [x, y, width, height]
                    "image_id": 0,
                }
                for idx, mask in enumerate(masks)
            ],
            "categories": [
                {"id": 0, "name": "coral", "sub-categories": []},
                {"id": 1, "name": "base", "sub-categories": []},
            ],
        }
        return output_json

    def stream_create_project(
        self,
        token: str,
        images: List[Image.Image],
        image_filenames: List[str],
        config: Dict,
    ) -> Iterator[Dict]:
        """
        Generator that processes images and yields progress events.

        Args:
            token: Externally-generated UUID used for temp file naming and cleanup.

        Yields:
            {"type": "progress", "value": <0-95>, "message": <str>}
            {"type": "done"}

        Raises the original exception (after cleaning up temp files) on failure.
        """
        temp_dir = os.path.join(self.temp_folder, f"project_{token}")
        zip_output_path = os.path.join(self.temp_folder, f"project_{token}.coral")

        os.makedirs(temp_dir, exist_ok=True)
        image_folder = os.path.join(temp_dir, "images")
        annotations_folder = os.path.join(temp_dir, "annotations")
        embeddings_folder = os.path.join(temp_dir, "embeddings")
        os.makedirs(image_folder, exist_ok=True)
        os.makedirs(annotations_folder, exist_ok=True)
        os.makedirs(embeddings_folder, exist_ok=True)

        _logger.info(f"Config for project {token}: {config}")

        try:
            sorted_indexes = np.argsort(image_filenames)
            images = [images[i] for i in sorted_indexes]
            filenames = [image_filenames[i] for i in sorted_indexes]
            n = len(images)

            for idx, (image, filename) in enumerate(zip(images, filenames)):
                yield {
                    "type": "progress",
                    "value": int(idx / n * 90),
                    "message": f"Processing {filename} ({idx + 1}/{n})",
                }

                state = self.sam3_model.gen_embeddings(image)

                if config.get("model") == "CoralSCOP":
                    output_json = self.run_coral_scop(image, config)
                elif config.get("model") == "CoralTank":
                    output_json = self.run_coral_tank(image, config)
                else:
                    output_json = {
                        "image": {
                            "image_filename": filename,
                            "image_width": image.width,
                            "image_height": image.height,
                            "id": idx,
                        },
                        "annotations": [],
                        "categories": [],
                    }

                filename_without_ext = os.path.splitext(filename)[0]

                # Save image
                image_output_path = os.path.join(image_folder, filename)
                image.save(image_output_path)

                # Save annotations
                with open(
                    os.path.join(annotations_folder, f"{filename_without_ext}.json"),
                    "w",
                ) as f:
                    json.dump(output_json, f, indent=4)

                # Save embeddings
                output_embedding_path = os.path.join(
                    embeddings_folder, f"{filename_without_ext}.pt"
                )
                torch.save(state, output_embedding_path)

                yield {
                    "type": "progress",
                    "value": int((idx + 1) / n * 80),
                    "message": f"Finished processing {filename}",
                }

            yield {"type": "progress", "value": 85, "message": "Packaging project file"}

            project_info = {
                "last_idx": 0,
                "creation_time": token,
                "config": config,
            }
            with open(os.path.join(temp_dir, "project_info.json"), "w") as f:
                json.dump(project_info, f, indent=4)

            with zipfile.ZipFile(
                zip_output_path, "w", compression=zipfile.ZIP_DEFLATED
            ) as zf:
                for folder_name in ["images", "annotations", "embeddings"]:
                    folder_path = os.path.join(temp_dir, folder_name)
                    for root, _, files in os.walk(folder_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zf.write(file_path, os.path.relpath(file_path, temp_dir))
                project_info_path = os.path.join(temp_dir, "project_info.json")
                zf.write(
                    project_info_path, os.path.relpath(project_info_path, temp_dir)
                )
            # Remove the temp directory after zipping (but keep the zip file for download)
            shutil.rmtree(temp_dir, ignore_errors=True)

            yield {"type": "done", "token": token}

        except Exception:
            _logger.exception("Project creation failed (token=%s)", token)
            self.clean_up(token)
            raise
