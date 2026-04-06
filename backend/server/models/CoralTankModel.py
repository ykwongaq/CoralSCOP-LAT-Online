import numpy as np
from PIL import Image
from ultralytics import YOLO

from ..utils.logger import get_logger
from ..utils.masks import encode_masks
from .modelQueue import ModelQueue

_logger = get_logger(__name__)

from typing import Dict, List


class CoralTankModel:
    def __init__(self, checkpoint_path: str):
        _logger.info("Loading CoralTankModel from %s", checkpoint_path)
        self.model = YOLO(checkpoint_path)
        self._model_queue = ModelQueue(self.model)
        _logger.info("CoralTankModel loaded")

    def predict(self, image: Image.Image) -> List[Dict]:
        with self._model_queue as model:
            result = model.predict(image, retina_masks=True)[0]
            result = result.cpu().numpy()

            masks = []
            for mask in result.masks.data:
                masks.append(encode_masks(mask))

            return masks
