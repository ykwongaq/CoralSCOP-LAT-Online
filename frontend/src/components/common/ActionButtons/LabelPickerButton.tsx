import { useEffect, useRef } from "react";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import SmallLabelButton from "./SmallLabelButton";

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

	// Close popup on outside click
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
			className={`toggle-color-plate-popup toggle-fn${isOpen ? " open" : ""}`}
			id="category-selector"
		>
			<div className="toggle-color-plate-popup__pop toggle-fn__hide">
				<p className="toggle-color-plate-popup__label">Label</p>
				<div className="color-plate-list toggle-color-plate-popup__list">
					{labels.map((label, index) => (
						<SmallLabelButton
							key={label.id}
							label={label}
							onClick={() => onSelectLabel(label)}
						/>
					))}
				</div>
			</div>
			<button
				id="assign-category-toggle-button"
				className="toggle-fn__btn toggle-color-plate-popup__button float-bar__button toggle-button"
				onClick={onToggle}
			>
				{buttonChildren}
			</button>
		</div>
	);
}
