import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useAnnotationCommands } from "../../../hooks/useAnnotationCommands";
import { useAnnotationKeyboard } from "../../../hooks/useAnnotationKeyboard";
import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
import { AddModeBar, SelectModeBar } from "./AnnotationBars";

export const AnnotationPanelID = "annotation-panel";

interface AnnotationPanelProps {
	selectModeChildren?: React.ReactNode;
	addModeChildren?: React.ReactNode;
}

/**
 * Sets up annotation keyboard shortcuts and renders the default annotation
 * layout in one place. Optional extra controls can still be appended to the
 * select/add mode action bars when needed.
 */
export function AnnotationPanel({
	selectModeChildren,
	addModeChildren,
}: AnnotationPanelProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute } = useAnnotationCommands();

	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	return (
		<>
			<AnnotationSideBar />
			<AnnotationCanvas />
			<SelectModeBar>{selectModeChildren}</SelectModeBar>
			<AddModeBar>{addModeChildren}</AddModeBar>
		</>
	);
}
