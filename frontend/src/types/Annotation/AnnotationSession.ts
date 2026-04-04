import { type RLE, type Label, type Annotation } from ".";

// State for the annotation process
export default interface AnnotationSessionState {
	// Pending masks to be added to the annotation session
	pendingMask: RLE | null;

	// Currently activate label ID
	activateLabelID: Label | null;

	// Currently selected annotations in the images
	selectedAnnotations: Annotation[];
}
