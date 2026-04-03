from pycocotools import mask as maskUtils
import numpy as np

from typing import Dict, List, Optional


def encode_masks(mask: np.ndarray) -> Dict:
    """
    Encode the binary mask into RLE format
    """
    rle = maskUtils.encode(np.asfortranarray(mask.astype(np.uint8)))
    rle["counts"] = rle["counts"].decode(
        "utf-8"
    )  # Convert bytes to string for JSON serialization
    return rle


def decode_mask(encoded_mask, height: int = None, width: int = None) -> np.ndarray:
    """
    Decode the RLE-encoded mask back into a binary mask
    """
    if isinstance(encoded_mask, list):
        assert (
            height is not None and width is not None
        ), "Height and width must be provided for dict-encoded masks"
        rles = maskUtils.frPyObjects(encoded_mask, height, width)
        rle = maskUtils.merge(rles)
        return maskUtils.decode(rle).astype(np.uint8)
    elif isinstance(encoded_mask, dict):
        return maskUtils.decode(encoded_mask).astype(np.uint8)
    else:
        raise ValueError("Invalid encoded mask format")
