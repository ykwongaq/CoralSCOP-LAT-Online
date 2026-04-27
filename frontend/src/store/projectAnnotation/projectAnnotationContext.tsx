import { createContext, useContext, useReducer } from "react";
import type { ProjectState } from "../../types";
import {
	projectAnnotationReducer,
	initialProjectAnnotationState,
	type ProjectAnnotationAction,
} from "./projectAnnotationReducer";

export const ProjectContext = createContext<{
	projectState: ProjectState;
	projectDispatch: React.Dispatch<ProjectAnnotationAction>;
} | null>(null);

export function useProject() {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
}

export function ProjectProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [projectState, projectDispatch] = useReducer(
		projectAnnotationReducer,
		initialProjectAnnotationState,
	);

	return (
		<ProjectContext.Provider value={{ projectState, projectDispatch }}>
			{children}
		</ProjectContext.Provider>
	);
}
