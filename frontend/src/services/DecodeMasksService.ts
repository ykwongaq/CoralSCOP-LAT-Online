import { apiClient } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import type { RLE } from "../types/Annotation/RLE";

export interface DecodeMasksRequest {
  masks: RLE[];
}

export interface DecodeMasksResponse {
  /** One base64 string per input mask. Each decodes to a flat row-major
   *  Uint8Array where every byte is 0 (background) or 1 (foreground):
   *  index = row * width + col. */
  masks: string[];
}

export function decodeMasks(
  request: DecodeMasksRequest,
  callbacks: ApiRequestCallbacks<DecodeMasksResponse>,
): ApiRequestHandle {
  callbacks.onLoading?.();

  return apiClient.request<DecodeMasksResponse>("/api/masks/decode", {
    method: "POST",
    body: { masks: request.masks },
    onProgress: callbacks.onProgress,
    onError: callbacks.onError,
    onComplete: callbacks.onComplete,
  });
}

/**
 * Convert a base64 string from DecodeMasksResponse into a flat row-major
 * Uint8Array ready for use with canvas ImageData.
 *
 * Usage:
 *   const pixelMask = base64ToPixelMask(response.masks[i]);
 *   // pixelMask[row * width + col] === 1  →  foreground pixel
 */
export function base64ToPixelMask(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Promise-based wrapper around decodeMasks.
 * Resolves with one row-major Uint8Array per input RLE.
 */
export function decodeMasksAsync(masks: RLE[]): Promise<Uint8Array[]> {
  return new Promise((resolve, reject) => {
    decodeMasks(
      { masks },
      {
        onComplete: (response) =>
          resolve(response.masks.map(base64ToPixelMask)),
        onError: (error) => reject(new Error(error.message)),
      },
    );
  });
}
