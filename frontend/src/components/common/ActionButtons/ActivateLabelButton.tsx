import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";
import LabelPickerButton from "./LabelPickerButton";

interface ActivateLabelButtonProps {
	isOpen: boolean;
	onToggle: () => void;
}

export default function ActivateLabelButton({
	isOpen,
	onToggle,
}: ActivateLabelButtonProps) {
	const { dispatchAnnotationSession, annotationSessionState } =
		useAnnotationSession();
	const activeLabel = annotationSessionState.activateLabel;

	const handleActivate = (label: Label) => {
		dispatchAnnotationSession({ type: "SET_ACTIVE_LABEL", payload: label });
		onToggle();
	};

	return (
		<LabelPickerButton
			isOpen={isOpen}
			onToggle={onToggle}
			onSelectLabel={handleActivate}
			buttonChildren={
				<>
					<span
						className="color-blk selected-category-box"
						style={{
							backgroundColor: activeLabel
								? getLabelColor(activeLabel.id)
								: "#dedede",
							color: activeLabel ? getTextColor(activeLabel.id) : "#000",
						}}
					>
						{activeLabel && (
							<span className="label-sm-blk__text selected-category-text">
								{activeLabel.id + 1}
							</span>
						)}
					</span>
					<span>Assign Label (C)</span>
				</>
			}
		/>
	);
}
