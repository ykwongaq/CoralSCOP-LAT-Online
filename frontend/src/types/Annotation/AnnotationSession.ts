import { type RLE, type Label, type Annotation, type ProjectState } from ".";

export type PointPrompt = {
	x: number;
	y: number;
	type: "positive" | "negative";
};

// State for the annotation process
export default interface AnnotationSessionState {
	// Pending masks to be added to the annotation session
	pendingMask: Annotation | null;

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
