import { createContext, useContext } from "react";
import type { ProjectState } from "../../types/Annotation/Project";
import { type ProjectAnnotationAction } from "./reducer";

export const ProjectContext = createContext<{
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAnnotationAction>;
} | null>(null);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
