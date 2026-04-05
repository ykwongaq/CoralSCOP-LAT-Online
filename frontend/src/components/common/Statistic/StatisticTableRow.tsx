import type { Annotation } from "../../../types/Annotation";
import CroppedCanvas from "./CroppedCanvas";

export interface InstanceRowData {
	id: number;
	labelName: string;
	statuses: string[];
	bleachingPct: number | null;
	areaPct: number;
}

interface StatisticTableRowProps {
	row: InstanceRowData;
	annotation: Annotation;
	imageUrl: string;
	imageWidth: number;
	imageHeight: number;
	showCroppedCanvas?: boolean;
}

/**
 * A single row in the statistic table.
 * The cropped canvas is displayed in the first column when showCroppedCanvas is true.
 */
export default function StatisticTableRow({
	row,
	annotation,
	imageUrl,
	imageWidth,
	imageHeight,
	showCroppedCanvas = true,
}: StatisticTableRowProps) {

	return (
		<tr>
			{showCroppedCanvas && (
				<td className="stat-cell-crop">
					<div className="stat-crop-wrap-row">
						<CroppedCanvas
							imageUrl={imageUrl}
							annotation={annotation}
							imageWidth={imageWidth}
							imageHeight={imageHeight}
						/>
					</div>
				</td>
			)}
			<td>{row.labelName}</td>
			<td>
				{row.statuses.length > 0 ? (
					<div className="stat-tag-list">
						{row.statuses.map((s) => (
							<span key={s} className="stat-tag">
								{s}
							</span>
						))}
					</div>
				) : (
					<span className="stat-no-status">—</span>
				)}
			</td>
			<td>
				{row.bleachingPct === null ? (
					<span className="stat-loading">…</span>
				) : (
					`${row.bleachingPct.toFixed(1)}%`
				)}
			</td>
			<td>{row.areaPct.toFixed(2)}%</td>
		</tr>
	);
}
