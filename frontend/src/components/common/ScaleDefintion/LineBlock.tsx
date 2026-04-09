import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { ScaledLine } from "../../../types/Annotation/ScaledLine";

interface LineBlockProps {
	line: ScaledLine;
}

export default function LineBlock({ line }: LineBlockProps) {
	const { state, dispatch } = useProject();
	const { annotationSessionState, dispatchAnnotationSession } =
		useAnnotationSession();
	const currentData = state.dataList[annotationSessionState.currentDataIndex];

	const isSelected = annotationSessionState.selectedScaledLineId === line.id;
	const pixelLength = Math.hypot(
		line.end.x - line.start.x,
		line.end.y - line.start.y,
	).toFixed(1);

	const handleSelect = () => {
		dispatchAnnotationSession({
			type: "SELECT_SCALED_LINE_ID",
			payload: line.id,
		});
	};

	const handleScaleChange = (value: string) => {
		if (!currentData) return;
		const parsedValue = Number(value);
		dispatch({
			type: "UPDATE_SCALED_LINE",
			payload: {
				dataId: currentData.id,
				lineId: line.id,
				updates: {
					scale: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
				},
			},
		});
	};

	const handleUnitChange = (unit: ScaledLine["unit"]) => {
		if (!currentData) return;
		dispatch({
			type: "UPDATE_SCALED_LINE",
			payload: {
				dataId: currentData.id,
				lineId: line.id,
				updates: { unit },
			},
		});
	};

	const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (!currentData) return;
		dispatch({
			type: "DELETE_SCALED_LINE",
			payload: { dataId: currentData.id, lineId: line.id },
		});
		if (isSelected) {
			dispatchAnnotationSession({
				type: "SELECT_SCALED_LINE_ID",
				payload: null,
			});
		}
	};

	return (
		<div
			className={`scale-line-block${isSelected ? " scale-line-block--selected" : ""}`}
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
			<div className="scale-line-block__header">
				<div>
					<p className="scale-line-block__title">Line {line.id + 1}</p>
					<p className="scale-line-block__meta">Length: {pixelLength}px</p>
				</div>
				<span className="scale-line-block__tag">
					{isSelected ? "Selected" : "Click to select"}
				</span>
			</div>

			<div className="scale-line-block__controls">
				<label className="scale-line-block__field">
					<span>Scale</span>
					<input
						className="scale-line-block__input"
						type="number"
						min="0"
						step="0.01"
						value={line.scale}
						onChange={(e) => handleScaleChange(e.target.value)}
					/>
				</label>

				<label className="scale-line-block__field">
					<span>Unit</span>
					<select
						className="scale-line-block__select"
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
					className="scale-line-block__delete"
					onClick={handleDelete}
				>
					Delete line
				</button>
			</div>
		</div>
	);
}