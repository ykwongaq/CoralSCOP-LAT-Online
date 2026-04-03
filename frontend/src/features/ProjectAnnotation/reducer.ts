import type { Data } from "../../types/Annotation/Data";
import { type ProjectState } from "../../types/Annotation/Project";

export type ProjectAnnotationAction = { type: "ADD_DATA"; payload: Data };

export function projectAnnotationReducer(
  state: ProjectState,
  action: ProjectAnnotationAction,
): ProjectState {
  switch (action.type) {
    case "ADD_DATA":
      return state;
    default:
      return state;
  }
}
