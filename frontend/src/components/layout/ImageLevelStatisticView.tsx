import { useMemo } from "react";
import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	Legend,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import { getLabelColor } from "../common/LabelColorMap";
import type { RLE } from "../../types/RLE";
import type { Label, Data } from "../../types/Annotation";

function countRLEPixels(rle: RLE): number {
	let count = 0;
	for (let i = 1; i < rle.counts.length; i += 2) {
		count += rle.counts[i];
	}
	return count;
}

interface CoverageData {
	totalPct: number;
	byLabel: { name: string; pixels: number; pct: number; color: string }[];
}

function useCoverageData(data: Data | null, labels: Label[]): CoverageData {
	return useMemo(() => {
		if (!data) return { totalPct: 0, byLabel: [] };
		const total = data.imageData.width * data.imageData.height;
		if (total === 0) return { totalPct: 0, byLabel: [] };

		const byLabelId: Record<number, number> = {};
		for (const ann of data.annotations) {
			const px = countRLEPixels(ann.segmentation);
			byLabelId[ann.labelId] = (byLabelId[ann.labelId] ?? 0) + px;
		}

		const byLabel = labels.map((label) => {
			const pixels = byLabelId[label.id] ?? 0;
			return {
				name: label.name,
				pixels,
				pct: (pixels / total) * 100,
				color: getLabelColor(label.id),
			};
		});

		const totalPixels = Object.values(byLabelId).reduce((a, b) => a + b, 0);
		return { totalPct: (totalPixels / total) * 100, byLabel };
	}, [data, labels]);
}

interface Props {
	data: Data | null;
	labels: Label[];
}

export default function ImageLevelStatisticView({ data, labels }: Props) {
	const coverage = useCoverageData(data, labels);
	const totalAnnotations = data?.annotations.length ?? 0;

	const activeLabels = coverage.byLabel.filter((l) => l.pct > 0);
	const pieData = [
		...activeLabels,
		{
			name: "Uncovered",
			pct: Math.max(0, 100 - coverage.totalPct),
			color: "#e8ecf0",
		},
	];
	const barData = activeLabels.map((l) => ({
		name: l.name,
		coverage: parseFloat(l.pct.toFixed(2)),
		color: l.color,
	}));

	return (
		<div className="stat-section">
			<h3 className="stat-section__title">Image Statistics</h3>

			<div className="stat-summary-row">
				<div className="stat-summary-card">
					<span className="stat-summary-card__value">
						{coverage.totalPct.toFixed(1)}%
					</span>
					<span className="stat-summary-card__label">Total Coverage</span>
				</div>
				<div className="stat-summary-card">
					<span className="stat-summary-card__value">{totalAnnotations}</span>
					<span className="stat-summary-card__label">Annotations</span>
				</div>
				<div className="stat-summary-card">
					<span className="stat-summary-card__value">{activeLabels.length}</span>
					<span className="stat-summary-card__label">Categories</span>
				</div>
			</div>

			{pieData.length > 0 && (
				<div className="stat-charts-row">
					<div className="stat-chart-wrap">
						<p className="stat-chart-label">Coverage Breakdown</p>
						<ResponsiveContainer width="100%" height={200}>
							<PieChart>
								<Pie
									data={pieData}
									dataKey="pct"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={75}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									label={(entry: any) =>
										(entry.pct as number) > 4
											? `${(entry.pct as number).toFixed(1)}%`
											: ""
									}
									labelLine={false}
								>
									{pieData.map((entry, i) => (
										<Cell key={i} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									formatter={(value: unknown) =>
										typeof value === "number"
											? `${value.toFixed(2)}%`
											: String(value)
									}
								/>
								<Legend
									iconType="circle"
									iconSize={10}
									wrapperStyle={{ fontSize: "11px", fontFamily: "Roboto" }}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>

					{barData.length > 0 && (
						<div className="stat-chart-wrap">
							<p className="stat-chart-label">Coverage by Category (%)</p>
							<ResponsiveContainer width="100%" height={200}>
								<BarChart
									data={barData}
									margin={{ top: 5, right: 10, left: 0, bottom: 45 }}
								>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="name"
										tick={{ fontSize: 10, fontFamily: "Roboto" }}
										angle={-35}
										textAnchor="end"
										interval={0}
									/>
									<YAxis
										tick={{ fontSize: 10, fontFamily: "Roboto" }}
										tickFormatter={(v: unknown) =>
											typeof v === "number" ? `${v}%` : String(v)
										}
									/>
									<Tooltip
										formatter={(v: unknown) =>
											typeof v === "number" ? [`${v}%`, "Coverage"] : [String(v)]
										}
									/>
									<Bar dataKey="coverage" radius={[3, 3, 0, 0]}>
										{barData.map((entry, i) => (
											<Cell key={i} fill={entry.color} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</div>
			)}

			{!data && (
				<p className="stat-empty-hint">No image selected.</p>
			)}
		</div>
	);
}
