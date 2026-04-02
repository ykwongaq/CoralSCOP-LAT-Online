import json
import os
import shutil
import tempfile
import zipfile
from typing import Dict, Iterator, List

import numpy as np
import torch
from PIL import Image

from .models.SAM3Model import SAM3Model
from .utils.logger import get_logger
from .utils.path import resolve_path

_logger = get_logger(__name__)


class ProjectHandler:
    # TEMP_FOLDER = os.path.join(tempfile.gettempdir())
    TEMP_FOLDER = "/home/davidwong/Documents/temp"

    def __init__(self, sam_model: SAM3Model):
        self.sam3_model = sam_model

    def clean_up(self, token: str) -> None:
        zip_path = os.path.join(self.TEMP_FOLDER, f"project_{token}.coral")
        if os.path.exists(zip_path):
            os.remove(zip_path)

        temp_dir = os.path.join(self.TEMP_FOLDER, f"project_{token}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    def delete_project(self, token: str) -> None:
        self.clean_up(token)

    def get_zip_path(self, token: str) -> str:
        return os.path.join(self.TEMP_FOLDER, f"project_{token}.coral")

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
        temp_dir = os.path.join(self.TEMP_FOLDER, f"project_{token}")
        zip_output_path = os.path.join(self.TEMP_FOLDER, f"project_{token}.coral")

        os.makedirs(temp_dir, exist_ok=True)
        image_folder = os.path.join(temp_dir, "images")
        annotations_folder = os.path.join(temp_dir, "annotations")
        embeddings_folder = os.path.join(temp_dir, "embeddings")
        os.makedirs(image_folder, exist_ok=True)
        os.makedirs(annotations_folder, exist_ok=True)
        os.makedirs(embeddings_folder, exist_ok=True)

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
                    annotations = self.run_coral_scop(image)
                elif config.get("model") == "CoralTank":
                    annotations = self.run_coral_tank(image)
                else:
                    annotations = {
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
                    json.dump(annotations, f, indent=4)

                # Save embeddings
                output_embedding_path = os.path.join(
                    embeddings_folder, f"{filename_without_ext}.pt"
                )
                torch.save(state, output_embedding_path)

                yield {
                    "type": "progress",
                    "value": int((idx + 1) / n * 90),
                    "message": f"Finished processing {filename}",
                }

            yield {"type": "progress", "value": 95, "message": "Packaging project file"}

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

    def run_coral_scop(self, image: Image.Image) -> Dict:
        return {}

    def run_coral_tank(self, image: Image.Image) -> Dict:
        return {}
