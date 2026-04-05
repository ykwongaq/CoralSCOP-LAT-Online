import { apiClient, API_BASE } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface CreateSamSessionResponse {
	session_id: string;
}

export interface UploadEmbeddingRequest {
	sessionId: string;
	stem: string;
	data: ArrayBuffer;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a new SAM embedding session on the server.
 *
 * The returned `session_id` must be passed to every subsequent
 * {@link uploadEmbedding} call and to the predict endpoint.
 * Sessions are auto-evicted after 30 minutes of inactivity; call
 * {@link releaseSession} to delete them immediately when done.
 */
export function createSamSession(
	callbacks: ApiRequestCallbacks<CreateSamSessionResponse>,
): ApiRequestHandle {
	return apiClient.request<CreateSamSessionResponse>("/api/sam/sessions", {
		method: "POST",
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}

/**
 * Uploads a single .pt embedding file into an existing session.
 *
 * @param request.sessionId  UUID returned by {@link createSamSession}
 * @param request.stem       Image filename without extension (e.g. "DSC_0001")
 * @param request.data       Raw bytes of the `torch.save(state)` .pt file
 */
export function uploadEmbedding(
	request: UploadEmbeddingRequest,
	callbacks: ApiRequestCallbacks<void>,
): ApiRequestHandle {
	const { sessionId, stem, data } = request;
	const form = new FormData();
	form.append("file", new Blob([data]), `${stem}.pt`);

	return apiClient.request<void>(
		`/api/sam/sessions/${encodeURIComponent(sessionId)}/embeddings/${encodeURIComponent(stem)}`,
		{
			method: "POST",
			body: form,
			onError: callbacks.onError,
			onComplete: callbacks.onComplete,
		},
	);
}

/**
 * Deletes a SAM session and all its stored embeddings immediately.
 * Fire-and-forget — errors are silently ignored.
 * Should be called when the user closes a project or loads a new one.
 */
export function releaseSession(sessionId: string): void {
	apiClient.request(
		`/api/sam/sessions/${encodeURIComponent(sessionId)}`,
		{ method: "DELETE" },
	);
}

/**
 * Deletes a SAM session during a page unload event (tab close / refresh).
 * Uses `fetch` with `keepalive: true` so the request survives page teardown.
 * `apiClient` wraps an AbortController and is not safe to use in `beforeunload`.
 */
export function releaseSessionOnUnload(sessionId: string): void {
	void fetch(
		`${API_BASE}/api/sam/sessions/${encodeURIComponent(sessionId)}`,
		{ method: "DELETE", keepalive: true },
	);
}
