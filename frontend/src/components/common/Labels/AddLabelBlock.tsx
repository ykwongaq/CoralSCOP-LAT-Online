import { useEffect, useRef, useState } from "react";
import { useToggleInput } from "../../../hooks/useToggleInputOptions";
import styles from "./Labels.module.css";

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
		<div ref={containerRef}>
			<button className={styles.expandableInputBtn} onClick={toggle}>
				<span className={styles.expandableInputBtnIcon}>{isOpen ? "×" : "+"}</span>
				<span className={styles.expandableInputBtnText}>{isOpen ? "Cancel" : "Add Label"}</span>
			</button>
			{isOpen && (
				<div className={styles.inputBlk}>
					<div className={styles.inputBlkWrap}>
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
							className={styles.inputBlkConfirm}
							id="add-category-button"
							type="button"
							onClick={handleConfirm}
						>
							Confirm
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
