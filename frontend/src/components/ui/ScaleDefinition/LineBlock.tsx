import type { ScaledLine } from "../../../types/annoations/ScaledLine";
import styles from "./LineBlock.module.css";

export interface LineBlockProps {
	line: ScaledLine;
	isSelected: boolean;
	onSelect: (id: number) => void;
	onScaleChange: (id: number, scale: number) => void;
	onUnitChange: (id: number, unit: ScaledLine["unit"]) => void;
	onDelete: (id: number) => void;
}

export default function LineBlock({
	line,
	isSelected,
	onSelect,
	onScaleChange,
	onUnitChange,
	onDelete,
}: LineBlockProps) {
	const pixelLength = Math.hypot(
		line.end.x - line.start.x,
		line.end.y - line.start.y,
	).toFixed(1);

	const handleSelect = () => {
		onSelect(line.id);
	};

	const handleScaleChange = (value: string) => {
		const parsedValue = Number(value);
		onScaleChange(
			line.id,
			Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
		);
	};

	const handleUnitChange = (unit: ScaledLine["unit"]) => {
		onUnitChange(line.id, unit);
	};

	const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		onDelete(line.id);
	};

	return (
		<div
			className={`${styles.scaleLineBlock}${isSelected ? ` ${styles.scaleLineBlockSelected}` : ""}`}
			onClick={handleSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleSelect();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className={styles.scaleLineBlockHeader}>
				<div>
					<p className={styles.scaleLineBlockTitle}>Line {line.id + 1}</p>
					<p className={styles.scaleLineBlockMeta}>Length: {pixelLength}px</p>
				</div>
				<span className={styles.scaleLineBlockTag}>
					{isSelected ? "Selected" : "Click to select"}
				</span>
			</div>

			<div className={styles.scaleLineBlockControls}>
				<label className={styles.scaleLineBlockField}>
					<span>Scale</span>
					<input
						className={styles.scaleLineBlockInput}
						type="number"
						min="0"
						step="0.01"
						value={line.scale}
						onChange={(e) => handleScaleChange(e.target.value)}
					/>
				</label>

				<label className={styles.scaleLineBlockField}>
					<span>Unit</span>
					<select
						className={styles.scaleLineBlockSelect}
						value={line.unit}
						onChange={(e) =>
							handleUnitChange(e.target.value as ScaledLine["unit"])
						}
					>
						<option value="cm">cm</option>
						<option value="mm">mm</option>
						<option value="m">m</option>
					</select>
				</label>

				<button
					type="button"
					className={styles.scaleLineBlockDelete}
					onClick={handleDelete}
				>
					Delete line
				</button>
			</div>
		</div>
	);
}
