import numpy as np
import torch
from PIL import Image
from sam3.model.sam3_image_processor import Sam3Processor
from sam3.model_builder import build_sam3_image_model

from ..utils.logger import get_logger
from .modelQueue import ModelQueue

_logger = get_logger(__name__)


class SAM3Model:

    def __init__(self, checkpoint_path: str):
        _logger.info("Loading SAM model from %s", checkpoint_path)
        self.model = build_sam3_image_model(
            checkpoint_path=checkpoint_path,
            enable_inst_interactivity=True,
        )
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.float().eval().to(self.device)
        self.processor = Sam3Processor(self.model)

        self._queue = ModelQueue(self.processor, max_concurrent=1)
        _logger.info("SAM model loaded (device=%s)", self.device)

    def gen_embeddings(self, image: Image.Image) -> torch.Tensor:
        with torch.autocast(self.device.type, dtype=torch.bfloat16):
            with self._queue as processor:
                return processor.set_image(image)
