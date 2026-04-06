import { apiClient } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";

import type { RLE } from "../types/RLE";
import type { CompressedRLE } from "../types/CompressedRLE";
export interface EncodeMaskRequest {
	inputs: RLE[]; // List of RLE dicts with "size" and "counts" as list of ints
}

export interface EncodeMaskResponse {
	segmentation: CompressedRLE[];
}

export function encodeMask(
	request: EncodeMaskRequest,
	callbacks: ApiRequestCallbacks<EncodeMaskResponse>,
): ApiRequestHandle {
	callbacks.onLoading?.();

	return apiClient.request<EncodeMaskResponse>("/api/masks/encode", {
		method: "POST",
		body: request as unknown as Record<string, unknown>,
		onProgress: callbacks.onProgress,
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}
