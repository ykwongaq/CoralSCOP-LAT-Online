import JSZip from "jszip";
import { openDB } from "idb";
import type { ProjectState } from "../types/Annotation/Project";
import type { Data } from "../types/Annotation/Data";
import type { Annotation } from "../types/Annotation/Annotation";
import type { Label } from "../types/Annotation/Label";
import type { RLE } from "../types/Annotation/RLE";

// IndexedDB used to persist embeddings so they can be sent to the backend
// for SAM inference without re-reading the file.
const DB_NAME = "coral-embeddings";
const EMBEDDINGS_STORE = "embeddings";

function getEmbeddingsDB() {
	return openDB(DB_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
				db.createObjectStore(EMBEDDINGS_STORE);
			}
		},
	});
}

// Raw shapes from the per-image annotation JSON files inside the .coral zip.
// The backend writes one file per image at annotations/<stem>.json.
interface CocoAnnotation {
	id: number;
	image_id: number;
	category_id: number;
	segmentation: RLE;
}

interface CocoCategory {
	id: number;
	name: string;
	color: string;
	status: string[];
}

interface AnnotationFile {
	image: {
		image_filename: string;
		image_width: number;
		image_height: number;
		id: number;
	};
	annotations: CocoAnnotation[];
	categories: CocoCategory[];
}

export interface LoadProjectCallbacks {
	onLoading?: () => void;
	onProgress?: (progress: number) => void;
	onError?: (error: { message: string }) => void;
	onComplete?: (state: ProjectState) => void;
}

/**
 * Unzips a .coral project file (ZIP archive) in the browser and:
 *  - Creates object URLs for images (in-memory, current session only)
 *  - Parses annotation JSON files into the ProjectState shape
 *  - Stores embedding .pt files as ArrayBuffers in IndexedDB, keyed by
 *    `<projectName>/<stem>`, so they can later be fetched and sent to the
 *    backend for SAM inference.
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

		zip.forEach((path, entry) => {
			if (entry.dir) return;
			if (path.startsWith("images/")) {
				imageEntries.push(entry);
			} else if (path.startsWith("annotations/")) {
				const stem = path.replace("annotations/", "").replace(/\.json$/, "");
				annotationMap.set(stem, entry);
			} else if (path.startsWith("embeddings/")) {
				embeddingEntries.push(entry);
			}
		});

		// Sort alphabetically to match the order the backend used when building the zip
		imageEntries.sort((a, b) => a.name.localeCompare(b.name));

		const projectName = file.name.replace(/\.coral$/, "");
		const n = imageEntries.length;
		const labelsMap = new Map<number, Label>();
		const dataList: Data[] = [];

		for (let i = 0; i < n; i++) {
			const imageEntry = imageEntries[i];
			const imageName = imageEntry.name.replace("images/", "");
			const stem = imageName.replace(/\.[^.]+$/, "");

			callbacks.onProgress?.(10 + Math.round((i / n) * 70));

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

			dataList.push({ id: i, imageData: { imageUrl, imageName }, annotations });
		}

		callbacks.onProgress?.(85);

		// Store embeddings in IndexedDB so they are available for backend SAM calls
		if (embeddingEntries.length > 0) {
			const db = await getEmbeddingsDB();
			for (const entry of embeddingEntries) {
				const stem = entry.name.replace("embeddings/", "").replace(/\.pt$/, "");
				const buf = await entry.async("arraybuffer");
				await db.put(EMBEDDINGS_STORE, buf, `${projectName}/${stem}`);
			}
		}

		callbacks.onProgress?.(100);
		callbacks.onComplete?.({
			dataList,
			labels: Array.from(labelsMap.values()),
			projectName,
		});
	} catch (err) {
		callbacks.onError?.({
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

/**
 * Retrieves a stored embedding ArrayBuffer from IndexedDB.
 * Returns null if not found.
 */
export async function getEmbedding(
	projectName: string,
	stem: string,
): Promise<ArrayBuffer | null> {
	const db = await getEmbeddingsDB();
	return (
		((await db.get(EMBEDDINGS_STORE, `${projectName}/${stem}`)) as
			| ArrayBuffer
			| undefined) ?? null
	);
}
