import JSZip from "jszip";
import type { ProjectState } from "../types/Annotation/Project";
import type { Data } from "../types/Annotation/Data";
import type { Label } from "../types/Annotation/Label";
import { type AnnotationFile } from "../types/ProjectCreation";
import triggerDownload from "../utils/download";

function buildAnnotationFile(data: Data, labels: Label[]): AnnotationFile {
	return {
		image: {
			image_filename: data.imageData.imageName,
			image_width: data.imageData.width,
			image_height: data.imageData.height,
			id: data.id,
		},
		annotations: data.annotations.map((a) => ({
			id: a.id,
			image_id: data.id,
			category_id: a.labelId,
			segmentation: a.segmentation,
		})),
		categories: labels.map((l) => ({
			id: l.id,
			name: l.name,
			color: "#ffffff",
			status: l.status,
		})),
	};
}

/**
 * Saves the current project state back to a .coral file and triggers a browser
 * download. Reuses images and embeddings from the original source file — only
 * the annotation JSON entries are rewritten, so no network calls are needed.
 */
export async function saveProject(state: ProjectState): Promise<void> {
	if (!state.sourceFile) {
		throw new Error("No source file available. Load a project first.");
	}

	// Clone the original ZIP so images and embeddings are included unchanged.
	const zip = await JSZip.loadAsync(state.sourceFile);

	// Overwrite only the annotation entries with the current in-memory state.
	for (const data of state.dataList) {
		const stem = data.imageData.imageName.replace(/\.[^.]+$/, "");
		zip.file(
			`annotations/${stem}.json`,
			JSON.stringify(buildAnnotationFile(data, state.labels), null, 4),
		);
	}

	const blob = await zip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
	});
	triggerDownload(blob, `${state.projectName}.coral`);
}
