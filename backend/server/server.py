import time
import uuid
from typing import Dict, List

from PIL import Image
from pydantic import BaseModel

from .maskHandler import MaskHandler
from .models.CoralSCOPModel import CoralSCOPModel
from .models.SAM3Model import SAM3Model
from .projectHandler import ProjectHandler
from .utils.logger import get_logger
from .utils.path import resolve_path

_logger = get_logger(__name__)


class _RLE(BaseModel):
    size: List[int]  # [height, width]
    counts: str


class DecodeMasksRequest(BaseModel):
    masks: List[_RLE]


class DecodeMasksResponse(BaseModel):
    masks: List[str]  # base64-encoded flat row-major arrays (1 byte per pixel, 0 or 1)


class EncodeMaskRequest(BaseModel):
    mask: str  # base64-encoded flat row-major array (1 byte per pixel, 0 or 1)
    height: int
    width: int


class EncodeMaskResponse(BaseModel):
    segmentation: dict  # {"size": [h, w], "counts": "<RLE string>"}


class Server:

    def __init__(self, config: dict):
        self.config = config
        _logger.info("Initializing Server")

        sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
        coralSCOP = CoralSCOPModel(
            model_path=resolve_path(config["CoralSCOP"]["coralSCOP_model_path"]),
            model_type=config["CoralSCOP"]["model_type"],
            iou_threshold=config["CoralSCOP"]["iou_threshold"],
            sta_threshold=config["CoralSCOP"]["sta_threshold"],
            max_masks_num=config["CoralSCOP"]["max_masks_num"],
            point_number=config["CoralSCOP"]["point_number"],
        )
        self.project_handler = ProjectHandler(sam3, coralSCOP)

        self.mask_handler = MaskHandler()

    def get_zip_path(self, token: str) -> str:
        return self.project_handler.get_zip_path(token)

    def gen_token(self) -> str:
        return str(uuid.uuid4())

    def stream_create_project(
        self,
        images: List[Image.Image],
        image_filenames: List[str],
        config: Dict,
    ):
        token = self.gen_token()
        _logger.info(
            "Starting project creation (token=%s, images=%d)", token, len(images)
        )
        return self.project_handler.stream_create_project(
            token, images, image_filenames, config
        )

    def delete_project(self, token: str) -> None:
        _logger.info("Deleting project (token=%s)", token)
        self.project_handler.delete_project(token)

    def decode_masks(self, request: DecodeMasksRequest) -> DecodeMasksResponse:
        _logger.info(f"Decoding {len(request.masks)} masks")
        rle_dicts = [{"size": rle.size, "counts": rle.counts} for rle in request.masks]
        result = self.mask_handler.decode_masks(rle_dicts)
        return DecodeMasksResponse(masks=result)

    def encode_mask(self, request: EncodeMaskRequest) -> EncodeMaskResponse:
        _logger.info("Encoding mask")
        rle = self.mask_handler.encode_mask(request.mask, request.height, request.width)
        return EncodeMaskResponse(segmentation=rle)
