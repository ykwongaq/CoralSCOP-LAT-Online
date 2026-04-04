import base64
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, List

import numpy as np

from .utils.masks import decode_mask, encode_masks


def _decode_single_rle(rle: Dict) -> str:
    """
    Decode one COCO-RLE dict into a base64 flat row-major byte string.
    Module-level so it is picklable by ProcessPoolExecutor.
    """
    mask = decode_mask(rle)  # numpy (H, W), Fortran-order from pycocotools
    return base64.b64encode(mask.flatten().tobytes()).decode("utf-8")


class MaskHandler:
    """
    Handles encoding and decoding of COCO-format RLE masks.

    decode_masks parallelises work across a ProcessPoolExecutor so that
    CPU-bound pycocotools calls run concurrently for large batches.
    """

    # Only spawn a pool when the batch is large enough to offset fork overhead.
    _MULTIPROCESS_THRESHOLD = 4

    def decode_masks(self, masks: List[Dict]) -> List[str]:
        """
        Decode a list of COCO RLE dicts into base64 flat row-major byte strings.
        Uses multiprocessing for batches above the threshold.
        """
        if len(masks) < self._MULTIPROCESS_THRESHOLD:
            return [_decode_single_rle(m) for m in masks]

        with ProcessPoolExecutor() as executor:
            return list(executor.map(_decode_single_rle, masks))

    def encode_mask(self, mask_b64: str, height: int, width: int) -> Dict:
        """
        Encode a base64 flat row-major byte string into a COCO RLE dict.
        """
        raw = base64.b64decode(mask_b64)
        mask_flat = np.frombuffer(raw, dtype=np.uint8)
        mask_arr = mask_flat.reshape(height, width)  # C order (row-major)
        return encode_masks(mask_arr)  # applies np.asfortranarray internally
