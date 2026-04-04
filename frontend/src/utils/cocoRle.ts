import type { RLE } from "../types/Annotation/RLE";
import { decodeMasksAsync } from "../services/DecodeMasksService";

/**
 * Decode COCO compressed RLE masks via the backend API.
 *
 * Sends all masks in a single request and returns one row-major Uint8Array
 * per input RLE. Each byte is 0 (background) or 1 (foreground):
 *   index = row * width + col
 */
export async function decodeRleMasks(rles: RLE[]): Promise<Uint8Array[]> {
    return decodeMasksAsync(rles);
}
