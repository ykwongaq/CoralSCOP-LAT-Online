import { createContext, useContext } from "react";
import type { ProjectCreationState } from "../../types";
import type { ProjectCreationAction } from "./ProjectCreationReducer";

export const ProjectCreationContext = createContext<{
	state: ProjectCreationState;
	dispatch: React.Dispatch<ProjectCreationAction>;
} | null>(null);

export function useProjectCreation() {
	const context = useContext(ProjectCreationContext);
	if (!context) {
		throw new Error(
			"useProjectCreation must be used within a ProjectCreationProvider",
		);
	}
	return context;
}
