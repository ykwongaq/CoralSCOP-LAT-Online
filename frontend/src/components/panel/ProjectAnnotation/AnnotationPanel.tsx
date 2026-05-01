import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands, useAnnotationKeyboard } from "../../../hooks";
import {
	AnnotationSideBar,
	AnnotationCanvas,
	FlowBarSelectMode,
	FlowBarAddMode,
} from "../../layout";
interface AnnotationPanelProps {
	selectModeChildren?: React.ReactNode;
	addModeChildren?: React.ReactNode;
}

/**
 * Sets up annotation keyboard shortcuts and renders the default annotation
 * layout in one place. Optional extra controls can still be appended to the
 * select/add mode action bars when needed.
 */
export default function AnnotationPanel({
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
			<FlowBarSelectMode>{selectModeChildren}</FlowBarSelectMode>
			<FlowBarAddMode>{addModeChildren}</FlowBarAddMode>
		</>
	);
}
