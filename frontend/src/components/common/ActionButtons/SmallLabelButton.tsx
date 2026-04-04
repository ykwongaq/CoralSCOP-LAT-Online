import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";

interface SmallLabelButtonProps {
	label: Label;
	onClick: () => void;
}

export default function SmallLabelButton({
	label,
	onClick,
}: SmallLabelButtonProps) {
	const labelColor = getLabelColor(label.id);
	const labelTextColor = getTextColor(label.id);

	return (
		<div className="label-sm-blk color-plate-list__item toggle-color-plate-popup__list-item">
			<button
				className="label-sm-blk__btn color-plate-list__color-plate colorBox"
				style={{ backgroundColor: labelColor, color: labelTextColor }}
				onClick={onClick}
				title={label.name}
			>
				<span className="labelText label-sm-blk__text">{label.id + 1}</span>
			</button>
		</div>
	);
}
