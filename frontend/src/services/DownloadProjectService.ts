import { apiClient } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";

export interface DownloadProjectRequest {
  token: string;
  filename?: string;
  saveBlob?: (blob: Blob, suggestedName: string) => void | Promise<void>;
}

export interface DownloadProjectResponse {
  success: boolean;
}

export function downloadProject(
  request: DownloadProjectRequest,
  callbacks: ApiRequestCallbacks<DownloadProjectResponse>,
): ApiRequestHandle {
  const { token, filename, saveBlob } = request;

  return apiClient.request<Blob>(
    `/api/projects/download/${encodeURIComponent(token)}`,
    {
      method: "GET",
      responseType: "blob",
      onError: callbacks.onError,
      onComplete: async (blob) => {
        const suggestedName = filename ? `${filename}.coral` : `project_${token}.coral`;
        if (saveBlob) {
          await saveBlob(blob, suggestedName);
        } else {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = suggestedName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }

        callbacks.onComplete?.({ success: true });
      },
    },
  );
}
