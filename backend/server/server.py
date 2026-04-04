import base64
import io
import time
import uuid
from typing import Dict, List, Optional

import numpy as np
import torch
from PIL import Image
from pydantic import BaseModel

from .maskHandler import MaskHandler
from .models.CoralSCOPModel import CoralSCOPModel
from .models.SAM3Model import SAM3Model
from .projectHandler import ProjectHandler
from .utils.logger import get_logger
from .utils.masks import encode_masks
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


class PredictInstRequest(BaseModel):
    embeddings: bytes  # raw bytes from torch.save(state), i.e. a .pt blob
    input_points: List[List[float]]  # [[x1, y1], ...]
    input_labels: List[int]  # 1=foreground, 0=background per point
    mask_input: Optional[bytes] = None  # raw bytes of a [1, H, W] float32 .npy file


class PredictInstResponse(BaseModel):
    masks: List[
        _RLE
    ]  # COCO RLE per candidate mask, length N (1 if multimask_output=False, 3 if True)
    best_mask_logit: str  # base64-encoded .npy bytes, shape [1, 256, 256] float32
    # = logits[argmax(scores)]; pass directly back as mask_input in the next request


class Server:

    def __init__(self, config: dict):
        self.config = config
        _logger.info("Initializing Server")

        self.sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
        coralSCOP = CoralSCOPModel(
            model_path=resolve_path(config["CoralSCOP"]["coralSCOP_model_path"]),
            model_type=config["CoralSCOP"]["model_type"],
            iou_threshold=config["CoralSCOP"]["iou_threshold"],
            sta_threshold=config["CoralSCOP"]["sta_threshold"],
            max_masks_num=config["CoralSCOP"]["max_masks_num"],
            point_number=config["CoralSCOP"]["point_number"],
        )
        self.project_handler = ProjectHandler(self.sam3, coralSCOP)

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

    def predict_inst(self, request: PredictInstRequest) -> PredictInstResponse:
        _logger.info(
            "Running predict_inst (points=%d)",
            len(request.input_points),
        )
        state = torch.load(
            io.BytesIO(request.embeddings),
            map_location=self.sam3.device,
            weights_only=False,
        )

        input_points = np.array(request.input_points, dtype=np.float32)
        input_labels = np.array(request.input_labels, dtype=np.int32)

        mask_input = None
        if request.mask_input is not None:
            mask_input = np.load(io.BytesIO(request.mask_input))

        masks, scores, logits = self.sam3.predict_inst(
            state, input_points, input_labels, mask_input
        )

        # masks: [N, H, W] bool/uint8 — encode each candidate as COCO RLE
        rle_masks = [_RLE(**encode_masks(masks[i])) for i in range(masks.shape[0])]

        scores_list = scores.tolist()

        # logits: [N, 256, 256] — keep the best one as [1, 256, 256] for the next mask_input
        best_idx = int(np.argmax(scores))
        best_logit = logits[best_idx : best_idx + 1]  # [1, 256, 256]
        buf = io.BytesIO()
        np.save(buf, best_logit.astype(np.float32))
        best_mask_logit_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return PredictInstResponse(
            masks=rle_masks,
            best_mask_logit=best_mask_logit_b64,
        )
