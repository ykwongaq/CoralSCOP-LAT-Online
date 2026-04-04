import { apiClient } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import type { RLE } from "../types/Annotation/RLE";

export interface EncodeMaskRequest {
  /** Flat row-major pixel array: index = row * width + col, values 0 or 1. */
  mask: Uint8Array;
  height: number;
  width: number;
}

export interface EncodeMaskResponse {
  segmentation: RLE;
}

export function encodeMask(
  request: EncodeMaskRequest,
  callbacks: ApiRequestCallbacks<EncodeMaskResponse>,
): ApiRequestHandle {
  callbacks.onLoading?.();

  return apiClient.request<EncodeMaskResponse>("/api/masks/encode", {
    method: "POST",
    body: {
      mask: pixelMaskToBase64(request.mask),
      height: request.height,
      width: request.width,
    },
    onProgress: callbacks.onProgress,
    onError: callbacks.onError,
    onComplete: callbacks.onComplete,
  });
}

/**
 * Convert a flat row-major Uint8Array into a base64 string for the
 * EncodeMaskRequest body.
 */
export function pixelMaskToBase64(mask: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < mask.length; i++) {
    binary += String.fromCharCode(mask[i]);
  }
  return btoa(binary);
}
