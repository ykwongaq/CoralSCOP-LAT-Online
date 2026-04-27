import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";
import styles from "../Labels/Labels.module.css";

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
		<div className={styles.colorPlateListItem}>
			<button
				className={`${styles.colorPlate} colorBox`}
				style={{ backgroundColor: labelColor, color: labelTextColor }}
				onClick={onClick}
				title={label.name}
			>
				<span className="label-sm-blk__text">{label.id + 1}</span>
			</button>
		</div>
	);
}
