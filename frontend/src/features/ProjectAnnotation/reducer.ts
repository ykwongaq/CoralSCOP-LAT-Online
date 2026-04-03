import type { Label } from "../../types/Annotation";
import { type ProjectState } from "../../types/Annotation/Project";

export type ProjectAnnotationAction =
    | { type: "LOAD_PROJECT"; payload: ProjectState }
    | {
          type: "ADD_LABEL";
          payload: {
              labelName: string;
          };
      };

function addLabel(state: ProjectState, labelName: string): ProjectState {
    const newLabelId = state.labels.length;
    const newLabel: Label = {
        id: newLabelId,
        name: labelName,
        status: [],
    };

    return {
        ...state,
        labels: [...state.labels, newLabel],
    };
}

export function projectAnnotationReducer(
    state: ProjectState,
    action: ProjectAnnotationAction,
): ProjectState {
    switch (action.type) {
        case "LOAD_PROJECT":
            return action.payload;
        case "ADD_LABEL":
            return addLabel(state, action.payload.labelName);
        default:
            return state;
    }
}
