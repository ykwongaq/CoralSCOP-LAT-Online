import type { Data } from "../../types/Annotation/Data";
import { type ProjectState } from "../../types/Annotation/Project";

export type ProjectAnnotationAction =
  | { type: "ADD_DATA"; payload: Data }
  | { type: "LOAD_PROJECT"; payload: ProjectState };

export function projectAnnotationReducer(
  state: ProjectState,
  action: ProjectAnnotationAction,
): ProjectState {
  switch (action.type) {
    case "LOAD_PROJECT":
      return action.payload;
    case "ADD_DATA":
      return state;
    default:
      return state;
  }
}
