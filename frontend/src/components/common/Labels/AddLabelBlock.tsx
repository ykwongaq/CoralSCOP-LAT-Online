import { useEffect, useRef, useState } from "react";
import { useToggleInput } from "../../../hooks/useToggleInputOptions";
interface AddLabelBlockProps {
	onAddLabel: (labelName: string) => void;
}

export default function AddLabelBlock({ onAddLabel }: AddLabelBlockProps) {
	const [inputValue, setInputValue] = useState("");
	const { isOpen, inputRef, toggle, hide } = useToggleInput();
	const containerRef = useRef<HTMLDivElement>(null);

	const handleConfirm = () => {
		const trimmedValue = inputValue.trim();
		if (trimmedValue) {
			onAddLabel(trimmedValue);
			setInputValue("");
		}
	};

	// Hide input when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				hide();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [containerRef, hide]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleConfirm();
		}
	};

	return (
		<div
			ref={containerRef}
			className={`toggle-input-blk toggle-fn ${isOpen ? "open" : ""}`}
		>
			<button className="toggle-input-blk__btn" onClick={toggle}>
				<span className="icon">{isOpen ? "×" : "+"}</span>
				<span className="text">{isOpen ? "Cancel" : "Add Label"}</span>
			</button>
			<div className="input-blk toggle-fn__hide">
				<div className="input-blk__wrap">
					<input
						ref={inputRef}
						type="text"
						id="add-category-input"
						name="add"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
					<button
						className="input-blk__confirm"
						id="add-category-button"
						type="button"
						onClick={handleConfirm}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}
