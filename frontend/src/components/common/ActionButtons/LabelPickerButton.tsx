import { useEffect, useRef } from "react";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import SmallLabelButton from "./SmallLabelButton";
import styles from "../Labels/Labels.module.css";

interface LabelPickerButtonProps {
	isOpen: boolean;
	onToggle: () => void;
	onSelectLabel: (label: Label) => void;
	buttonChildren: React.ReactNode;
}

export default function LabelPickerButton({
	isOpen,
	onToggle,
	onSelectLabel,
	buttonChildren,
}: LabelPickerButtonProps) {
	const { state } = useProject();
	const labels = state.labels;
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				onToggle();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onToggle]);

	return (
		<div
			ref={containerRef}
			className={`${styles.colorPickerPopup}${isOpen ? ` ${styles.colorPickerPopupOpen}` : ""}`}
			id="category-selector"
		>
			{isOpen && (
				<div className={styles.colorPickerPop}>
					<p className={styles.colorPickerLabel}>Label</p>
					<div className={`${styles.colorPlateList} ${styles.colorPickerList}`}>
						{labels.map((label) => (
							<SmallLabelButton
								key={label.id}
								label={label}
								onClick={() => onSelectLabel(label)}
							/>
						))}
					</div>
				</div>
			)}
			<button
				id="assign-category-toggle-button"
				className={`${styles.colorPickerBtn} float-bar__button`}
				onClick={onToggle}
			>
				{buttonChildren}
			</button>
		</div>
	);
}
