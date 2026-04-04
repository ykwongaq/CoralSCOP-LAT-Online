import { createContext, useContext } from "react";
import type AnnotationSessionState from "../../types/Annotation/AnnotationSession";
import type { AnnotationSessionAction } from "./reducer";

export const AnnotationSessionContext = createContext<{
    state: AnnotationSessionState;
    dispatch: React.Dispatch<AnnotationSessionAction>;
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
