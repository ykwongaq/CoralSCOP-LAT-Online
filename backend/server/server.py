import base64
import io
import os
import tempfile
import uuid
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import HTTPException
from PIL import Image

from .embeddingStore import EmbeddingStore, _to_device
from .maskHandler import MaskHandler
from .models.CoralSCOPModel import CoralSCOPModel
from .models.CoralTankModel import CoralTankModel
from .models.SAM3Model import SAM3Model
from .projectHandler import ProjectHandler
from .utils.logger import get_logger
from .utils.masks import encode_masks
from .utils.path import resolve_path

_logger = get_logger(__name__)


class Server:

    def __init__(self, config: dict):
        self.config = config
        _logger.info("Initializing Server")

        self.temp_folder = os.path.join(
            tempfile.gettempdir(), "coralscop-lat-online-temp"
        )
        os.makedirs(self.temp_folder, exist_ok=True)

        # Persistent data directory for embeddings (never auto-deleted)
        data_dir = os.path.expanduser(
            config.get("data_dir", "~/.local/share/coralscop-lat")
        )
        embeddings_dir = os.path.join(data_dir, "embeddings")

        self.sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
        coralSCOP = CoralSCOPModel(
            model_path=resolve_path(config["CoralSCOP"]["coralSCOP_model_path"]),
            model_type=config["CoralSCOP"]["model_type"],
            iou_threshold=config["CoralSCOP"]["iou_threshold"],
            sta_threshold=config["CoralSCOP"]["sta_threshold"],
            max_masks_num=config["CoralSCOP"]["max_masks_num"],
            point_number=config["CoralSCOP"]["point_number"],
        )

        coral_tank_path = resolve_path(config["coral_tank_model_path"])
        coral_tank_model = CoralTankModel(coral_tank_path)

        self.mask_handler = MaskHandler()
        self.embedding_store = EmbeddingStore(base_dir=embeddings_dir)

        self.project_handler = ProjectHandler(
            os.path.join(self.temp_folder, "projects"),
            self.sam3,
            coralSCOP,
            coral_tank_model,
            embedding_store=self.embedding_store,
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

    def encode_masks(self, inputs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Encode a list of RLE masks into compressed RLE format.

        Args:
            inputs: List of dicts with keys:
                - size: List[int] [height, width]
                - counts: List[int] (RLE counts)

        Returns:
            List of dicts with keys:
                - size: List[int] [height, width]
                - counts: str (compressed RLE string)
        """
        _logger.info("Encoding masks (batch size=%d)", len(inputs))

        # Convert the input into list of dictionary
        rle_list = []
        for rle in inputs:
            rle_dict = {"size": rle["size"], "counts": rle["counts"]}
            rle_list.append(rle_dict)
        rle_list = self.mask_handler.encode_masks(rle_list)

        return rle_list

    def predict_inst(
        self,
        session_id: str,
        stem: str,
        input_points: List[List[float]],
        input_labels: List[int],
        mask_input: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run SAM interactive instance segmentation.

        Args:
            session_id: UUID string returned by create_embedding_session
            stem: image filename stem identifying which .pt to load
            input_points: array of [x, y] pairs, e.g. [[100,200],[300,400]]
            input_labels: array of ints (1=foreground, 0=background per point)
            mask_input: optional base64-encoded .npy bytes [1, 256, 256] float32
                       (pass best_mask_logit from the previous response)

        Returns:
            dict with keys:
                - mask: dict with "size" (List[int]) and "counts" (List[int]) for RLE
                - best_mask_logit: base64-encoded .npy bytes [1, 256, 256] float32
        """
        _logger.info(
            "Running predict_inst (session=%s stem=%s points=%d)",
            session_id,
            stem,
            len(input_points),
        )
        try:
            state = self.embedding_store.get(session_id, stem)
        except MemoryError:
            raise HTTPException(
                status_code=503,
                detail="Server is out of memory. Please try again later.",
            )

        if state is None:
            raise HTTPException(
                status_code=404,
                detail=f"No embedding for session_id={session_id!r} stem={stem!r}",
            )

        state = _to_device(state, self.sam3.device)

        input_points_np = np.array(input_points, dtype=np.float32)
        input_labels_np = np.array(input_labels, dtype=np.int32)

        mask_input_np = None
        if mask_input is not None:
            mask_input_np = np.load(io.BytesIO(base64.b64decode(mask_input)))

        # Use multimask_output=True when there is no prior mask (first click):
        # SAM generates 3 candidates and we pick the highest-scoring one.
        # Once a mask_input is available (subsequent clicks), a single output suffices.
        multimask = mask_input_np is None
        masks, scores, logits = self.sam3.predict_inst(
            state,
            input_points_np,
            input_labels_np,
            mask_input_np,
            multimask_output=multimask,
        )

        # masks: [N, H, W] bool/uint8 — encode each candidate as COCO RLE
        rle_masks = [encode_masks(masks[i]) for i in range(masks.shape[0])]

        # logits: [N, 256, 256] — keep the best one as [1, 256, 256] for the next mask_input
        best_idx = int(np.argmax(scores))
        best_logit = logits[best_idx : best_idx + 1]  # [1, 256, 256]
        buf = io.BytesIO()
        np.save(buf, best_logit.astype(np.float32))
        best_mask_logit_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        _logger.info(
            f"best_mask_logit b64: {best_mask_logit_b64[:50]}... (length={len(best_mask_logit_b64)})"
        )
        return {
            "mask": rle_masks[best_idx],
            "best_mask_logit": best_mask_logit_b64,
        }

    def quick_start(self, image: Image.Image, image_filename: str, config: Dict) -> str:
        """
        Create a single-image project and return the path to the .coral ZIP file.
        The caller is responsible for deleting the file after it has been sent.
        """
        _logger.info("Running quick_start (image_filename=%s)", image_filename)
        token = self.gen_token()
        # Consume the synchronous generator in-place (single image, CPU-bound)
        for _ in self.project_handler.stream_create_project(
            token, [image], [image_filename], config
        ):
            pass
        return self.project_handler.get_zip_path(token)

    def run_model(self, image: Image.Image, config: Dict) -> Dict:
        if config.get("model") == "CoralSCOP":
            return self.project_handler.run_coral_scop(image, config)
        elif config.get("model") == "CoralTank":
            return self.project_handler.run_coral_tank(image, config)
        else:
            return {
                "image": {
                    "image_filename": "",
                    "image_width": image.width,
                    "image_height": image.height,
                    "id": 0,
                },
                "annotations": [],
                "categories": [],
            }
