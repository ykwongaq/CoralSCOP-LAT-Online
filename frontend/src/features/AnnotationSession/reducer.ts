import type { Annotation, Label, RLE } from "../../types/Annotation";
import type AnnotationSessionState from "../../types/Annotation/AnnotationSession";

export type AnnotationSessionAction =
    | { type: "SET_PENDING_MASK"; payload: RLE }
    | { type: "CLEAR_PENDING_MASK" }
    | { type: "SET_ACTIVE_LABEL"; payload: Label | null }
    | { type: "SELECT_ANNOTATION"; payload: Annotation }
    | { type: "DESELECT_ANNOTATION"; payload: { id: number } }
    | { type: "CLEAR_SELECTION" };

export const initialAnnotationSessionState: AnnotationSessionState = {
    pendingMask: null,
    activateLabelID: null,
    selectedAnnotations: [],
};

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
        case "SELECT_ANNOTATION":
            return {
                ...state,
                selectedAnnotations: [
                    ...state.selectedAnnotations,
                    action.payload,
                ],
            };
        case "DESELECT_ANNOTATION":
            return {
                ...state,
                selectedAnnotations: state.selectedAnnotations.filter(
                    (a) => a.id !== action.payload.id,
                ),
            };
        case "CLEAR_SELECTION":
            return { ...state, selectedAnnotations: [] };
        default:
            return state;
    }
}
