import type { RLE } from "../types/RLE";
import type { Label, Data } from "../types/Annotation";
import { getLabelColor } from "../components/common/LabelColorMap";

export interface CoverageData {
	totalPct: number;
	byLabel: { name: string; pixels: number; pct: number; color: string }[];
}

/**
 * Counts the number of pixels in an RLE-encoded mask.
 * RLE format: [count_of_0s, count_of_1s, count_of_0s, count_of_1s, ...]
 * We sum the counts at odd indices (1, 3, 5, ...) which represent the 1s (foreground pixels).
 */
export function countRLEPixels(rle: RLE): number {
	let count = 0;
	for (let i = 1; i < rle.counts.length; i += 2) {
		count += rle.counts[i];
	}
	return count;
}

/**
 * Calculates coverage statistics for a dataset.
 * Returns the total coverage percentage and per-label breakdown.
 */
export function calculateCoverageData(data: Data | null, labels: Label[]): CoverageData {
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
}

/**
 * Filters coverage data to return only labels with non-zero coverage.
 */
export function getActiveLabels(coverage: CoverageData): CoverageData["byLabel"] {
	return coverage.byLabel.filter((l) => l.pixels > 0);
}

/**
 * Prepares data for the pie chart visualization.
 * Includes active labels and an "Uncovered" segment.
 */
export function preparePieData(coverage: CoverageData): Array<{
	name: string;
	pixels?: number;
	pct: number;
	color: string;
}> {
	const activeLabels = getActiveLabels(coverage);
	return [
		...activeLabels,
		{
			name: "Uncovered",
			pct: Math.max(0, 100 - coverage.totalPct),
			color: "#9ca3af",
		},
	];
}

/**
 * Prepares data for the bar chart visualization.
 */
export function prepareBarData(coverage: CoverageData): Array<{
	name: string;
	coverage: number;
	color: string;
}> {
	const activeLabels = getActiveLabels(coverage);
	return activeLabels.map((l) => ({
		name: l.name,
		coverage: parseFloat(l.pct.toFixed(2)),
		color: l.color,
	}));
}

/**
 * Gets basic image-level statistics.
 */
export function getImageStatistics(data: Data | null, coverage: CoverageData): {
	totalAnnotations: number;
	activeLabelCount: number;
	totalCoveragePct: number;
} {
	return {
		totalAnnotations: data?.annotations.length ?? 0,
		activeLabelCount: getActiveLabels(coverage).length,
		totalCoveragePct: coverage.totalPct,
	};
}
