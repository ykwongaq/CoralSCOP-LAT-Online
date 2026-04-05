import base64
import io
import os
import tempfile
import time
import uuid
from typing import Dict, List, Optional, Union

import numpy as np
from fastapi import HTTPException
from PIL import Image
from pydantic import BaseModel

from .embeddingStore import EmbeddingStore, _to_device
from .maskHandler import MaskHandler
from .models.CoralSCOPModel import CoralSCOPModel
from .models.SAM3Model import SAM3Model
from .projectHandler import ProjectHandler
from .utils.logger import get_logger
from .utils.masks import encode_masks
from .utils.path import resolve_path

_logger = get_logger(__name__)


class CompressedRLE(BaseModel):
    size: List[int]  # [height, width]
    counts: str


class RLE(BaseModel):
    size: List[int]  # [height, width]
    counts: List[int]  # RLE counts as list of integers


class EncodeMaskRequest(BaseModel):
    """
    The input should be a list of mask information

    inputs: List[Dict] where each dict has:
    - mask: List[int] (RLE counts)
    - height: int
    - width: int
    """

    inputs: List[RLE]


class EncodeMaskResponse(BaseModel):
    segmentation: List[CompressedRLE]  # {"size": [h, w], "counts": "<RLE string>"}


class PredictInstRequest(BaseModel):
    session_id: str  # UUID returned by POST /api/sam/sessions
    stem: str  # image filename stem identifying which .pt to load
    input_points: List[List[float]]  # [[x1, y1], ...]
    input_labels: List[int]  # 1=foreground, 0=background per point
    mask_input: Optional[str] = None  # base64-encoded .npy bytes [1, H, W] float32


class PredictInstResponse(BaseModel):
    mask: RLE
    best_mask_logit: str  # base64-encoded .npy bytes, shape [1, 256, 256] float32


class Server:

    def __init__(self, config: dict):
        self.config = config
        _logger.info("Initializing Server")

        # self.temp_folder = os.path.join(
        #     tempfile.gettempdir(), "coralscop-lat-online-temp"
        # )
        self.temp_folder = os.path.join(
            "/home/davidwong/Documents/temp", "coralscop-lat-online-temp"
        )
        os.makedirs(self.temp_folder, exist_ok=True)

        self.sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
        coralSCOP = CoralSCOPModel(
            model_path=resolve_path(config["CoralSCOP"]["coralSCOP_model_path"]),
            model_type=config["CoralSCOP"]["model_type"],
            iou_threshold=config["CoralSCOP"]["iou_threshold"],
            sta_threshold=config["CoralSCOP"]["sta_threshold"],
            max_masks_num=config["CoralSCOP"]["max_masks_num"],
            point_number=config["CoralSCOP"]["point_number"],
        )
        self.project_handler = ProjectHandler(
            os.path.join(self.temp_folder, "projects"), self.sam3, coralSCOP
        )
        self.mask_handler = MaskHandler()
        self.embedding_store = EmbeddingStore(
            base_dir=os.path.join(self.temp_folder, "embeddings")
        )

    def get_zip_path(self, token: str) -> str:
        return self.project_handler.get_zip_path(token)

    # ------------------------------------------------------------------
    # Embedding session management
    # ------------------------------------------------------------------

    def create_embedding_session(self) -> str:
        return self.embedding_store.create_session()

    def save_embedding(self, session_id: str, stem: str, data: bytes) -> None:
        self.embedding_store.save(session_id, stem, data)

    def delete_embedding_session(self, session_id: str) -> None:
        self.embedding_store.delete_session(session_id)

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

    def encode_masks(self, request: EncodeMaskRequest) -> EncodeMaskResponse:
        _logger.info("Encoding masks (batch size=%d)", len(request.inputs))
        rle_list = self.mask_handler.encode_masks(request.inputs)
        return EncodeMaskResponse(segmentation=rle_list)

    def predict_inst(self, request: PredictInstRequest) -> PredictInstResponse:
        _logger.info(
            "Running predict_inst (session=%s stem=%s points=%d)",
            request.session_id,
            request.stem,
            len(request.input_points),
        )
        try:
            state = self.embedding_store.get(request.session_id, request.stem)
        except MemoryError:
            raise HTTPException(
                status_code=503,
                detail="Server is out of memory. Please try again later.",
            )

        if state is None:
            raise HTTPException(
                status_code=404,
                detail=f"No embedding for session_id={request.session_id!r} stem={request.stem!r}",
            )

        state = _to_device(state, self.sam3.device)

        input_points = np.array(request.input_points, dtype=np.float32)
        input_labels = np.array(request.input_labels, dtype=np.int32)

        mask_input = None
        if request.mask_input is not None:
            mask_input = np.load(io.BytesIO(base64.b64decode(request.mask_input)))

        # Use multimask_output=True when there is no prior mask (first click):
        # SAM generates 3 candidates and we pick the highest-scoring one.
        # Once a mask_input is available (subsequent clicks), a single output suffices.
        multimask = mask_input is None
        masks, scores, logits = self.sam3.predict_inst(
            state, input_points, input_labels, mask_input, multimask_output=multimask
        )

        # masks: [N, H, W] bool/uint8 — encode each candidate as COCO RLE
        rle_masks = [
            RLE(**encode_masks(masks[i])) for i in range(masks.shape[0])
        ]

        # logits: [N, 256, 256] — keep the best one as [1, 256, 256] for the next mask_input
        best_idx = int(np.argmax(scores))
        best_logit = logits[best_idx : best_idx + 1]  # [1, 256, 256]
        buf = io.BytesIO()
        np.save(buf, best_logit.astype(np.float32))
        best_mask_logit_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        _logger.info(
            f"best_mask_logit b64: {best_mask_logit_b64[:50]}... (length={len(best_mask_logit_b64)})"
        )
        return PredictInstResponse(
            mask=rle_masks[best_idx],
            best_mask_logit=best_mask_logit_b64,
        )
