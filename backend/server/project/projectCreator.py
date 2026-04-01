import io
from typing import Any, Dict, List, Tuple, Callable
import tempfile
import time
import numpy as np
from PIL import Image
import os
import json
import zipfile
import torch

from sam3 import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor


class ProjectCreator:
    TEMP_FOLDER = os.path.join(tempfile.gettempdir())

    def __init__(self, config: dict):
        self.config = config

        model = (
            build_sam3_image_model(
                checkpoint_path=self.config["sam_model_path"],
                enable_inst_interactivity=True,
            )
            .float()
            .eval()
        )
        self.processor = Sam3Processor(model)

    def create_project(
        self, images: List[Image.Image], image_filenames: List[str], config: Dict
    ) -> Tuple[str, Callable[[], None]]:

        # Use the current timestamp to create a unique temporary directory
        timestamp = int(time.time())
        temp_dir = os.path.join(self.TEMP_FOLDER, f"project_{timestamp}")
        os.makedirs(temp_dir, exist_ok=True)

        image_folder = os.path.join(temp_dir, "images")
        os.makedirs(image_folder, exist_ok=True)

        annotations_folder = os.path.join(temp_dir, "annotations")
        os.makedirs(annotations_folder, exist_ok=True)

        embeddings_folder = os.path.join(temp_dir, "embeddings")
        os.makedirs(embeddings_folder, exist_ok=True)

        project_info_path = os.path.join(temp_dir, "project_info.json")

        zip_output_path = os.path.join(self.TEMP_FOLDER, f"project_{timestamp}.zip")

        # Provide a callback function to clean up the temporary files after the project is created

        def clean_up():
            if os.path.exists(zip_output_path):
                os.remove(zip_output_path)

            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for name in files:
                    os.remove(os.path.join(root, name))
                for name in dirs:
                    os.rmdir(os.path.join(root, name))
            os.rmdir(temp_dir)

        try:
            image_folder = os.path.join(temp_dir, "images")
            os.makedirs(image_folder, exist_ok=True)

            # Sort the image and filename lists based on the filenames
            sorted_indexes = np.argsort(image_filenames)
            images = [images[i] for i in sorted_indexes]
            filenames = [image_filenames[i] for i in sorted_indexes]

            for idx, (image, filename) in enumerate(zip(images, filenames)):
                state = self.processor.set_image(image)

                vision_tensor = state["backbone_out"]["vision_tensor"].cpu().copy()
                del state["backbone_out"]["vision_tensor"]

                if config["model"] == "CoralSCOP":
                    annotations = self.run_coral_scop(image)
                elif config["model"] == "CoralTank":
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

                # Save the image to the image folder
                output_image_path = os.path.join(image_folder, filename)
                image.save(output_image_path)

                # Save the annotation to the annotation folder
                output_annotation_path = os.path.join(
                    annotations_folder, f"{filename_without_ext}.json"
                )
                with open(output_annotation_path, "w") as f:
                    json.dump(annotations, f, indent=4)

                # Save the vision tensor to the embeddings folder
                output_embedding_path = os.path.join(
                    embeddings_folder, f"{filename_without_ext}.pt"
                )
                torch.save(vision_tensor, output_embedding_path)

                state_file = os.path.join(
                    embeddings_folder, f"{filename_without_ext}.json"
                )
                with open(state_file, "w") as f:
                    json.dump(state, f, indent=4)

            project_info = {
                "last_idx": 0,
                "creation_time": timestamp,
                "config": config,
            }

            with open(project_info_path, "w") as f:
                json.dump(project_info, f, indent=4)

            # Zip all the files into zip file
            with zipfile.ZipFile(zip_output_path, "w") as zip_file:
                for folder_name in ["images", "annotations", "embeddings"]:
                    folder_path = os.path.join(temp_dir, folder_name)
                    for root, dirs, files in os.walk(folder_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zip_file.write(
                                file_path,
                                os.path.relpath(file_path, temp_dir),
                            )

                zip_file.write(
                    project_info_path, os.path.relpath(project_info_path, temp_dir)
                )

            return zip_output_path, clean_up
        except Exception as e:
            raise e
        finally:
            clean_up()

    def run_coral_scop(self, image: Image.Image) -> Dict:
        return {}

    def run_coral_tank(self, image: Image.Image) -> Dict:
        return {}


if __name__ == "__main__":
    model = (
        build_sam3_image_model(
            checkpoint_path="/home/davidwong/Documents/Research/CoralSCOP-LAT-Online/backend/models/sam3/sam3.pt",
            enable_inst_interactivity=True,
        )
        .float()
        .eval()
    )
    processor = Sam3Processor(model)

    image_path = "/home/davidwong/Documents/Research/CoralSCOP-LAT-Online/backend/sam3/assets/images/truck.jpg"
    image = Image.open(image_path)

    state = processor.set_image(image)

    print(type(state))
    print(state["backbone_out"].keys())

    for key, value in state.items():
        print(f"{key}: {type(value)}")

    for key, value in state["backbone_out"].items():
        print(f"  {key}: {type(value)}")
        print(f"  {key}: {type(value)}")
        print(f"  {key}: {type(value)}")
