import { type Label, type ProjectState } from ".";
import type { PendingAnnotation } from "./PendingAnnotation";
import type { PointPrompt } from "./PointPrompt";

// State for the annotation process
export default interface AnnotationSessionState {
	// Pending masks to be added to the annotation session
	pendingMask: PendingAnnotation | null;

	// Currently activate label ID
	activateLabelID: Label | null;

	// Currently selected annotations in the images
	selectedAnnotations: number[];

	annotationMode: "select" | "add";

	currentDataIndex: number;

	prevsProjectState: ProjectState[];

	// Point prompts for SAM inference (add mode)
	pointPrompts: PointPrompt[];
}
