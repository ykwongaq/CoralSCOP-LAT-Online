import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import LabelPickerButton from "./LabelPickerButton";

interface AssignLabelButtonProps {
	isOpen: boolean;
	onToggle: () => void;
}

export default function AssignLabelButton({ isOpen, onToggle }: AssignLabelButtonProps) {
	const { dispatch } = useProject();
	const { annotationSessionState, dispatchAnnotationSession } =
		useAnnotationSession();

	const handleAssign = (label: Label) => {
		annotationSessionState.selectedAnnotations.forEach((annotationId) => {
			dispatch({
				type: "ASSIGN_LABEL_TO_ANNOTATION",
				payload: {
					dataId: annotationSessionState.currentDataIndex,
					annotationId: annotationId,
					labelId: label.id,
				},
			});
		});
		dispatchAnnotationSession({ type: "CLEAR_SELECTION" });
		onToggle();
	};

	return (
		<LabelPickerButton
			isOpen={isOpen}
			onToggle={onToggle}
			onSelectLabel={handleAssign}
			buttonChildren={<span>Assign Label (C)</span>}
		/>
	);
}
