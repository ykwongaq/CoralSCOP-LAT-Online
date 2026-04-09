import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useAnnotationCommands } from "../../../hooks/useAnnotationCommands";
import ActionButton from "../../common/ActionButtons/ActionButton";
import ActivateLabelButton from "../../common/ActionButtons/ActivateLabelButton";
import AssignLabelButton from "../../common/ActionButtons/AssignLabelButton";
import ActionBar from "../../layout/ActionBar";

interface ModeBarProps {
	children?: React.ReactNode;
}

/**
 * Standard action bar for "select" annotation mode.
 * Pass extra buttons as children to append them after the defaults.
 */
export function SelectModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute, isLabelPanelOpen, setIsLabelPanelOpen } =
		useAnnotationCommands();

	return (
		<ActionBar hidden={mode !== "select"}>
			<AssignLabelButton
				isOpen={isLabelPanelOpen}
				onToggle={() => setIsLabelPanelOpen((prev) => !prev)}
			/>
			<ActionButton
				name="Remove (R)"
				icon="ico-bin icon"
				onClick={() => execute["remove"]()}
			/>
			<ActionButton
				name="Add Mask (W)"
				icon="ico-shape icon"
				onClick={() => execute["switch-to-add"]()}
			/>
			{children}
		</ActionBar>
	);
}

/**
 * Standard action bar for "add" annotation mode.
 * Pass extra buttons as children to append them after the defaults.
 */
export function AddModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute, isActivateLabelOpen, setIsActivateLabelOpen } =
		useAnnotationCommands();

	return (
		<ActionBar hidden={mode !== "add"}>
			<ActivateLabelButton
				isOpen={isActivateLabelOpen}
				onToggle={() => setIsActivateLabelOpen((prev) => !prev)}
			/>
			<ActionButton
				name=""
				icon="ico-rotate icon"
				onClick={() => execute["clear-prompts"]()}
			/>
			<ActionButton
				name=""
				icon="ico-tick icon"
				onClick={() => execute["confirm-mask"]()}
			/>
			<ActionButton
				name="Back"
				icon="float-bar_button"
				onClick={() => execute["switch-to-select"]()}
			/>
			{children}
		</ActionBar>
	);
}
