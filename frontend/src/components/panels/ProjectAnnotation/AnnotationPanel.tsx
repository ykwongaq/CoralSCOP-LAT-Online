import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useAnnotationCommands } from "../../../hooks/useAnnotationCommands";
import { useAnnotationKeyboard } from "../../../hooks/useAnnotationKeyboard";
import ActionButton from "../../common/ActionButtons/ActionButton";
import ActivateLabelButton from "../../common/ActionButtons/ActivateLabelButton";
import AssignLabelButton from "../../common/ActionButtons/AssignLabelButton";
import ActionBar from "../../layout/ActionBar";
import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";

export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;

	const {
		execute,
		isLabelPanelOpen,
		setIsLabelPanelOpen,
		isActivateLabelOpen,
		setIsActivateLabelOpen,
	} = useAnnotationCommands();

	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	return (
		<>
			<AnnotationSideBar />
			<AnnotationCanvas />
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
			</ActionBar>
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
			</ActionBar>
		</>
	);
}
