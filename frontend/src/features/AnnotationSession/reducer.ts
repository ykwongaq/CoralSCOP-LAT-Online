import type { Annotation, Label, RLE } from "../../types/Annotation";
import type AnnotationSessionState from "../../types/Annotation/AnnotationSession";
import type { PointPrompt } from "../../types/Annotation/AnnotationSession";

export type AnnotationSessionAction =
	| { type: "SET_PENDING_MASK"; payload: RLE }
	| { type: "CLEAR_PENDING_MASK" }
	| { type: "SET_ACTIVE_LABEL"; payload: Label | null }
	| { type: "TOGGLE_ANNOTATION_SELECTION"; payload: { annIds: number[] } }
	| { type: "CLEAR_SELECTION" }
	| { type: "SET_ANNOTATION_MODE"; payload: "select" | "add" }
	| { type: "SET_CURRENT_DATA_INDEX"; payload: number }
	| { type: "ADD_POINT_PROMPT"; payload: PointPrompt }
	| { type: "CLEAR_POINT_PROMPTS" };

export const initialAnnotationSessionState: AnnotationSessionState = {
	pendingMask: null,
	activateLabelID: null,
	selectedAnnotations: [],
	annotationMode: "select",
	currentDataIndex: 0,
	prevsProjectState: [],
	pointPrompts: [],
};

function toggleMaskSelection(
	state: AnnotationSessionState,
	annIds: number[],
): AnnotationSessionState {
	// Toggle selection of annotations with given IDs
	// So that originally selected annotations that are toggled will be deselected, and vice versa
	const newSelected = new Set(state.selectedAnnotations.map((ann) => ann));
	for (const id of annIds) {
		if (newSelected.has(id)) {
			newSelected.delete(id);
		} else {
			newSelected.add(id);
		}
	}
	return { ...state, selectedAnnotations: Array.from(newSelected) };
}

export function annotationSessionReducer(
	state: AnnotationSessionState,
	action: AnnotationSessionAction,
): AnnotationSessionState {
	switch (action.type) {
		case "SET_PENDING_MASK":
			return { ...state, pendingMask: action.payload };
		case "CLEAR_PENDING_MASK":
			return { ...state, pendingMask: null };
		case "SET_ACTIVE_LABEL":
			return { ...state, activateLabelID: action.payload };
		case "TOGGLE_ANNOTATION_SELECTION":
			return toggleMaskSelection(state, action.payload.annIds);
		case "CLEAR_SELECTION":
			return { ...state, selectedAnnotations: [] };
		case "SET_ANNOTATION_MODE":
			return { ...state, annotationMode: action.payload };
		case "SET_CURRENT_DATA_INDEX":
			return { ...state, currentDataIndex: action.payload };
		case "ADD_POINT_PROMPT":
			return {
				...state,
				pointPrompts: [...state.pointPrompts, action.payload],
			};
		case "CLEAR_POINT_PROMPTS":
			return { ...state, pointPrompts: [] };
		default:
			return state;
	}
}
