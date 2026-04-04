import { useEffect, useRef, useState } from "react";
import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";
import SmallLabelButton from "./SmallLabelButton";

export default function ActivateLabelButton() {
	const { state } = useProject();
	const { annotationSessionState, dispatchAnnotationSession } =
		useAnnotationSession();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const labels = state.labels;
	const activeLabel = annotationSessionState.activateLabelID;

	const handleSelectLabel = (label: Label) => {
		dispatchAnnotationSession({ type: "SET_ACTIVE_LABEL", payload: label });
		setIsOpen(false);
	};

	const togglePopup = () => setIsOpen((prev) => !prev);

	// Keyboard shortcut 'C'
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key.toLowerCase() === "c" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey
			) {
				togglePopup();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Close popup on outside click
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div
			ref={containerRef}
			className={`toggle-color-plate-popup toggle-fn${isOpen ? " open" : ""}`}
			id="category-selector"
		>
			<div className="toggle-color-plate-popup__pop toggle-fn__hide">
				<p className="toggle-color-plate-popup__label">Label</p>
				<div className="color-plate-list toggle-color-plate-popup__list">
					{labels.map((label) => (
						<SmallLabelButton
							key={label.id}
							label={label}
							onClick={() => handleSelectLabel(label)}
						/>
					))}
				</div>
			</div>
			<button
				id="assign-category-toggle-button"
				className="toggle-fn__btn toggle-color-plate-popup__button float-bar__button toggle-button"
				onClick={togglePopup}
			>
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
							{activeLabel.id}
						</span>
					)}
				</span>
				<span>Assign Label (C)</span>
			</button>
		</div>
	);
}
