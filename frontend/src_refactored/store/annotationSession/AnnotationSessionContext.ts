import { createContext, useContext } from "react";
import type { AnnotationSessionState } from "../../types";
import type { AnnotationSessionAction } from "./AnnotationSessionReducer";

export const AnnotationSessionContext = createContext<{
	annotationSessionState: AnnotationSessionState;
	dispatchAnnotationSession: React.Dispatch<AnnotationSessionAction>;
} | null>(null);

export function useAnnotationSession() {
	const context = useContext(AnnotationSessionContext);
	if (!context) {
		throw new Error(
			"useAnnotationSession must be used within an AnnotationSessionProvider",
		);
	}
	return context;
}
