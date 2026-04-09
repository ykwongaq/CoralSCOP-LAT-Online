import JSZip from "jszip";
import type { ProjectState } from "../types/Annotation/Project";
import type { Data } from "../types/Annotation/Data";
import type { Annotation } from "../types/Annotation/Annotation";
import type { Label } from "../types/Annotation/Label";
import type { ApiRequestCallbacks } from "../types/api";
import {
	createSamSession,
	uploadEmbedding,
	type CreateSamSessionResponse,
} from "./SamService";
import { type AnnotationFile } from "../types/ProjectCreation";

export interface LoadProjectCallbacks {
	onLoading?: () => void;
	onProgress?: (progress: number) => void;
	onError?: (error: { message: string }) => void;
	onComplete?: (state: ProjectState) => void;
}

/**
 * Wrap a callback-based service function in a Promise so it can be awaited
 * inside the async loadProject flow.
 */
function toPromise<T>(
	fn: (
		callbacks: Pick<ApiRequestCallbacks<T>, "onError" | "onComplete">,
	) => void,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		fn({
			onError: (err) => reject(new Error(err.message)),
			onComplete: (data) => resolve(data),
		});
	});
}

/**
 * Unzips a .coral project file (ZIP archive) in the browser and:
 *  - Creates object URLs for images (in-memory, current session only)
 *  - Parses annotation JSON files into the ProjectState shape
 *
 * New-format .coral files (created without embedded embeddings):
 *  - Contain a project_info.json with a `project_id` field
 *  - Embeddings are stored persistently on the server under that project_id,
 *    which is used directly as the SAM session_id — no upload needed.
 *
 * Old-format .coral files (with an `embeddings/` folder inside):
 *  - Upload embedding .pt files to a new backend SAM session as before.
 *
 * Progress is reported from 0–100 via onProgress.
 */
export async function loadProject(
	file: File,
	callbacks: LoadProjectCallbacks,
): Promise<void> {
	callbacks.onLoading?.();

	try {
		callbacks.onProgress?.(5);

		const zip = await JSZip.loadAsync(file);

		// Bucket ZIP entries by folder
		const imageEntries: JSZip.JSZipObject[] = [];
		const annotationMap = new Map<string, JSZip.JSZipObject>(); // stem → entry
		const embeddingEntries: JSZip.JSZipObject[] = [];
		let projectInfoEntry: JSZip.JSZipObject | null = null;

		zip.forEach((path, entry) => {
			if (entry.dir) return;
			if (path.startsWith("images/")) {
				imageEntries.push(entry);
			} else if (path.startsWith("annotations/")) {
				const stem = path.replace("annotations/", "").replace(/\.json$/, "");
				annotationMap.set(stem, entry);
			} else if (path.startsWith("embeddings/")) {
				embeddingEntries.push(entry);
			} else if (path === "project_info.json") {
				projectInfoEntry = entry;
			}
		});

		// Sort alphabetically to match the order the backend used when building the zip
		imageEntries.sort((a, b) => a.name.localeCompare(b.name));

		const projectName = file.name.replace(/\.coral$/, "");
		const n = imageEntries.length;
		const labelsMap = new Map<number, Label>();
		const dataList: Data[] = [];

		// Phase 1 (10–70 %): parse images and annotations
		for (let i = 0; i < n; i++) {
			const imageEntry = imageEntries[i];
			const imageName = imageEntry.name.replace("images/", "");
			const stem = imageName.replace(/\.[^.]+$/, "");

			callbacks.onProgress?.(10 + Math.round((i / n) * 60));

			const imageBlob = await imageEntry.async("blob");
			const imageUrl = URL.createObjectURL(imageBlob);

			let annotations: Annotation[] = [];
			const annoEntry = annotationMap.get(stem);

			if (annoEntry) {
				const annoFile = JSON.parse(
					await annoEntry.async("text"),
				) as AnnotationFile;

				for (const cat of annoFile.categories) {
					if (!labelsMap.has(cat.id)) {
						labelsMap.set(cat.id, {
							id: cat.id,
							name: cat.name,
							status: cat.status ?? [],
						});
					}
				}

				annotations = annoFile.annotations.map((a) => ({
					segmentation: a.segmentation,
					labelId: a.category_id,
					id: a.id,
				}));
			}

			// Get the image height and width
			const { image_width: width, image_height: height } = annoEntry
				? JSON.parse(await annoEntry.async("text")).image
				: { image_width: 0, image_height: 0 };

			dataList.push({
				id: i,
				imageData: { imageUrl, imageName, width, height },
				annotations,
			});
		}

		callbacks.onProgress?.(70);

		// Phase 2 (70–95 %): resolve SAM session
		let projectId: string | undefined;
		let sessionId: string | undefined;

		// New-format: project_info.json contains project_id; embeddings live on server
		if (projectInfoEntry !== null) {
			try {
				const info = JSON.parse(
					await (projectInfoEntry as JSZip.JSZipObject).async("text"),
				) as Record<string, unknown>;
				if (typeof info.project_id === "string") {
					projectId = info.project_id;
					sessionId = projectId; // token = session_id on the backend
				}
			} catch {
				// Malformed project_info.json — fall through to legacy path
			}
		}

		// Old-format: upload embedded .pt files to a fresh session
		if (sessionId === undefined && embeddingEntries.length > 0) {
			const { session_id } = await toPromise<CreateSamSessionResponse>((cb) =>
				createSamSession(cb),
			);
			sessionId = session_id;

			const m = embeddingEntries.length;
			for (let j = 0; j < m; j++) {
				const entry = embeddingEntries[j];
				const stem = entry.name
					.replace("embeddings/", "")
					.replace(/\.pt$/, "");

				callbacks.onProgress?.(70 + Math.round(((j + 1) / m) * 25));

				const data = await entry.async("arraybuffer");
				await toPromise<void>((cb) =>
					uploadEmbedding({ sessionId: session_id, stem, data }, cb),
				);
			}
		}

		callbacks.onProgress?.(100);
		callbacks.onComplete?.({
			dataList,
			labels: Array.from(labelsMap.values()),
			projectName,
			scaledLineList: [],
			projectId,
			sessionId,
			sourceFile: file,
		});
	} catch (err) {
		callbacks.onError?.({
			message: err instanceof Error ? err.message : String(err),
		});
	}
}
