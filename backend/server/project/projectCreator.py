import io
from typing import Any, Dict, List

import numpy as np
from PIL import Image
from sam3 import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor


class ProjectCreator:

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
    ) -> io.BytesIO:
        zip_buffer = io.BytesIO()

        # Sort the image and filename lists based on the filenames
        sorted_indexes = np.argsort(image_filenames)
        images = [images[i] for i in sorted_indexes]
        filenames = [image_filenames[i] for i in sorted_indexes]

        for image, filename in zip(images, filenames):
            state = self.processor.set_image(image)

            vision_tensor = state["backbone_out"]["vision_tensor"].cpu().copy()
            del state["backbone_out"]["vision_tensor"]

            if config["model"] == "CoralSCOP":
                annotations = self.run_coral_scop(image)
            elif config["model"] == "CoralTank":
                annotations = self.run_coral_tank(image)
            else:
                annotations = {}

        return zip_buffer

    def run_coral_scop(self, image: Image.Image) -> Dict:
        return None

    def run_coral_tank(self, image: Image.Image) -> Dict:
        return None


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
