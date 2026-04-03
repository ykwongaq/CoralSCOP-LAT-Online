import time
from typing import Dict, List, Set, Tuple

import numpy as np
import torch

from ..utils.logger import get_logger
from ..utils.masks import encode_masks, decode_mask
from .modelQueue import ModelQueue
from .segment_anything import SamAutomaticMaskGenerator, sam_model_registry

_logger = get_logger(__name__)


class CoralSCOPModel:

    def __init__(
        self,
        model_path,
        model_type,
        point_number=32,
        iou_threshold=0.62,
        sta_threshold=0.62,
        max_masks_num=100,
    ):
        _logger.info("Loading CoralSCOP model from %s", model_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        sam = sam_model_registry[model_type](checkpoint=model_path)
        sam.to(self.device)

        self.max_masks_num = max_masks_num
        mask_generator = SamAutomaticMaskGenerator(
            model=sam,
            points_per_side=point_number,
            pred_iou_thresh=iou_threshold,
            stability_score_thresh=sta_threshold,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

        self._queue = ModelQueue(mask_generator, max_concurrent=1)
        _logger.info("CoralSCOP model loaded (device=%s)", self.device)

    def gen_annotations(
        self,
        image: np.ndarray,
        min_area: float = 0.0 - 1,
        min_confidence: float = 0.5,
        max_iou: float = 0.1,
    ) -> Dict:
        with self._queue as mask_generator:
            masks = mask_generator.generate(image)

        _logger.info(
            f"Generated {len(masks)} masks, returning top {self.max_masks_num} masks"
        )

        # Filter out the masks that the predicted_iou is null
        masks = [mask for mask in masks if mask["predicted_iou"] is not None]

        # Sort the masks by the predicted_iou in descending order
        masks.sort(key=lambda x: x["predicted_iou"], reverse=True)

        masks = self.filter(masks, min_area, min_confidence, max_iou)

        annotations = {"annotations": []}

        for idx, mask in enumerate(masks[: self.max_masks_num]):
            annotation = {
                "id": idx,
                "segmentation": encode_masks(mask["segmentation"]),
                "predicted_iou": mask["predicted_iou"],
                "stability_score": mask["stability_score"],
                "area": mask["area"],
                "image_id": 0,
                "bbox": mask["bbox"],
            }
            annotations["annotations"].append(annotation)

        return annotations

    def filter(
        self, masks: List[Dict], min_area: float, min_confidence: float, max_iou: float
    ) -> List[Dict]:
        """
        Filter out the masks
        """
        self.logger.info(
            f"Filtering masks with min_area: {min_area}, min_confidence: {min_confidence}, max_iou: {max_iou}"
        )

        self.logger.info(f"All indices: {list(range(len(masks)))}")

        start_time = time.time()
        filtered_index_by_area = self.filter_by_area(masks, min_area)
        self.logger.info(f"Filter by area: {time.time() - start_time:.2f} seconds")
        self.logger.info(
            f"Remain {len(filtered_index_by_area)} masks after filtering by area: {filtered_index_by_area}"
        )

        start_time = time.time()
        filtered_index_by_confidence = self.filter_by_confidence(masks, min_confidence)
        self.logger.info(
            f"Filter by confidence: {time.time() - start_time:.2f} seconds"
        )
        self.logger.info(
            f"Remain {len(filtered_index_by_confidence)} masks after filtering by confidence: {filtered_index_by_confidence}"
        )

        start_time = time.time()
        filtered_index_by_iou = self.filter_by_iou(masks, max_iou)
        self.logger.info(f"Filter by iou: {time.time() - start_time:.2f} seconds")
        self.logger.info(
            f"Remain {len(filtered_index_by_iou)} masks after filtering by iou: {filtered_index_by_iou}"
        )

        filtered_index = (
            filtered_index_by_area
            & filtered_index_by_confidence
            & filtered_index_by_iou
        )
        self.logger.info(
            f"Remain {len(filtered_index)} masks after all filtering: {filtered_index}"
        )

        filtered_indices = list(filtered_index)
        masks = [masks[idx] for idx in filtered_indices]

        return masks

    def filter_by_area(self, annotations: List[Dict], area_limit: float) -> Set:
        """
        Filter out the masks which exceed the area limit
        """

        if len(annotations) == 0:
            return set()

        def decode_and_compute_area(annotation):
            mask = decode_mask(annotation["segmentation"])
            area = np.sum(mask)
            return area

        image_size = annotations[0]["segmentation"]["size"]
        image_height = int(image_size[0])
        image_width = int(image_size[1])
        total_area = image_height * image_width
        min_area = total_area * area_limit

        filtered_index = set()
        for annotation in annotations:
            idx = annotation["id"]
            area = decode_and_compute_area(annotation)
            if area >= min_area:
                filtered_index.add(idx)

        return filtered_index

    def filter_by_confidence(
        self, annotations: List[Dict], confidence_limit: float
    ) -> Set:
        """
        Filter out the masks which have confidence lower than the confidence limit
        """
        filtered_index = set()
        for annotation in annotations:
            if annotation["predicted_iou"] >= confidence_limit:
                filtered_index.add(annotation["id"])

        return filtered_index

    def filter_by_iou(self, annotations: List[Dict], iou_limit: float) -> Set:
        """
        Filter out the masks which have iou lower than the iou limit
        """
        masks = [decode_mask(annotation["segmentation"]) for annotation in annotations]
        return set(self.filter_by_iou_(masks, iou_limit))

    def filter_by_iou_(
        self, masks: List[np.ndarray], iou_threshold: float = 0.5
    ) -> List[int]:
        """
        Given a list of 2D binary masks and an IoU threshold, filter out masks that overlap
        too much with already-kept masks (IoU > iou_threshold). In case of overlap, the
        mask with the smaller area is removed. We always keep the bigger mask.

        Args:
        masks (list of np.ndarray): A list of 2D binary arrays with shape (H, W).
        iou_threshold (float): The IoU threshold above which we consider two masks
                                overlapping "too much."

        Returns:
        A list of indices (relative to the input list) for the masks that are kept.
        """

        if len(masks) == 0:
            return []

        # Convert each 2D mask into a flattened 1D boolean array.
        # This shape will be (N, mask_height * mask_width)
        # Use dtype=bool or uint8 to reduce memory overhead and speed up calculations.
        N = len(masks)
        flattened_masks = []
        areas = np.zeros(N, dtype=np.float64)

        for i, mask in enumerate(masks):
            # Ensure mask is boolean for efficient bitwise ops and multiplication
            mask_bool = mask > 0
            flattened_masks.append(mask_bool.ravel())
            areas[i] = mask_bool.sum()

        # Stack into a single 2D array of shape (N, -1)
        # This operation can take time for large H*W, but it's done once.
        M = np.stack(flattened_masks, axis=0).astype(np.float32)  # shape: (N, H*W)

        # Compute intersection for every pair via matrix multiplication:
        # intersection[i, j] = sum(M[i, :] * M[j, :])
        # Because M is 0/1, multiplication is effectively a bitwise AND.
        # shape of intersection_matrix: (N, N)
        intersection_matrix = M @ M.T

        # For each mask i, area[i] is the total 1's in mask i.
        # union[i, j] = area[i] + area[j] - intersection[i, j]
        area_col = areas.reshape(-1, 1)  # shape: (N, 1)
        area_row = areas.reshape(1, -1)  # shape: (1, N)
        union_matrix = area_col + area_row - intersection_matrix

        # Compute the IoU matrix
        # Avoid division by zero -> only relevant if union=0 for some degenerate masks
        iou_matrix = intersection_matrix / np.clip(union_matrix, a_min=1, a_max=None)

        # Sort masks by area DESC (largest first)
        sorted_indices = np.argsort(areas)[::-1]

        suppressed = np.zeros(N, dtype=bool)  # Track whether a mask is suppressed
        keep = []  # Indices of masks to keep (in sorted order for now)

        for idx in sorted_indices:
            if not suppressed[idx]:
                # Keep this mask
                keep.append(idx)
                # Suppress all masks that have IoU above threshold with this mask
                to_suppress = iou_matrix[idx] >= iou_threshold
                suppressed[to_suppress] = True

        # Sort kept indices back in ascending order to match typical indexing order
        keep.sort()
        return keep
