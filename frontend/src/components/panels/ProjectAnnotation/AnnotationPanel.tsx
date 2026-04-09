import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useAnnotationCommands } from "../../../hooks/useAnnotationCommands";
import { useAnnotationKeyboard } from "../../../hooks/useAnnotationKeyboard";
export const AnnotationPanelID = "annotation-panel";

interface AnnotationPanelProps {
	children: React.ReactNode;
}

/**
 * Sets up annotation keyboard shortcuts and renders whatever layout children
 * are provided.  Callers compose the ActionBars (SelectModeBar, AddModeBar,
 * or any future mode bars) and pass them as children alongside AnnotationSideBar
 * and AnnotationCanvas.
 */
export function AnnotationPanel({ children }: AnnotationPanelProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute } = useAnnotationCommands();

	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	return <>{children}</>;
}
