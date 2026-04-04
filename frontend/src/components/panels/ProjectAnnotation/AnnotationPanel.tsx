import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import ActionButton from "../../common/ActionButtons/ActionButton";
import ActivateLabelButton from "../../common/ActionButtons/ActivateLabelButton";
import AssignLabelButton from "../../common/ActionButtons/AssignLabelButton";
import ActionBar from "../../layout/ActionBar";
import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
	const { annotationSessionState, dispatchAnnotationSession } =
		useAnnotationSession();

	return (
		<>
			<AnnotationSideBar />
			<AnnotationCanvas />
			<ActionBar hidden={annotationSessionState.annotationMode !== "select"}>
				<AssignLabelButton />
				<ActionButton
					name="Remove (R)"
					icon="ico-bin icon"
					onClick={() => {}}
				/>
				<ActionButton
					name="Add Mask (W)"
					icon="ico-shape icon"
					onClick={() => {
						dispatchAnnotationSession({
							type: "SET_ANNOTATION_MODE",
							payload: "add",
						});
					}}
				/>
				<ActionButton name="" icon="ico-undo icon" onClick={() => {}} />
				<ActionButton name="" icon="ico-redo icon" onClick={() => {}} />
			</ActionBar>
			<ActionBar hidden={annotationSessionState.annotationMode !== "add"}>
				<ActivateLabelButton />
				<ActionButton name="" icon="ico-undo icon" onClick={() => {}} />
				<ActionButton name="" icon="ico-rotate icon" onClick={() => {}} />
				<ActionButton name="" icon="ico-tick icon" onClick={() => {}} />
				<ActionButton
					name="Back"
					icon="float-bar_button"
					onClick={() => {
						dispatchAnnotationSession({
							type: "SET_ANNOTATION_MODE",
							payload: "select",
						});
					}}
				/>
			</ActionBar>
		</>
	);
}
