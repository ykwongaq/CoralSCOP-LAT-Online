import type { RLE } from "../types/RLE";
import type { Label, Data, Annotation } from "../types/Annotation";
import { getLabelColor } from "../components/common/LabelColorMap";
import { decodeRLE } from "../utils/cocoRle";

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

// ---------------------------------------------------------------------------
// Instance-level bleaching statistics
// ---------------------------------------------------------------------------

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * Calculates the bounding box of a binary mask.
 * @param mask - Binary mask as Uint8Array (1 = foreground, 0 = background)
 * @param width - Width of the image
 * @returns Bounding box or null if mask is empty
 */
export function getMaskBoundingBox(
	mask: Uint8Array,
	width: number,
): BoundingBox | null {
	let minX = width,
		minY = mask.length,
		maxX = -1,
		maxY = -1;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		const x = i % width;
		const y = Math.floor(i / width);
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	if (maxX < 0) return null;
	return { minX, minY, maxX, maxY };
}

/**
 * Calculates the bleaching percentage of a coral instance.
 * @param pixelData - Image pixel data from canvas
 * @param mask - Binary mask as Uint8Array
 * @returns Bleaching percentage (0-100)
 */
export function calculateBleaching(pixelData: ImageData, mask: Uint8Array): number {
	const { data } = pixelData;
	let total = 0;
	let bleached = 0;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		total++;
		const idx = i * 4;
		if (data[idx] > 200 && data[idx + 1] > 200 && data[idx + 2] > 200) {
			bleached++;
		}
	}
	return total === 0 ? 0 : (bleached / total) * 100;
}

/**
 * Determines the bleaching status based on percentage.
 * @param pct - Bleaching percentage
 * @returns Status string: "Healthy", "Partially Bleached", or "Bleached"
 */
export function getBleachingStatus(pct: number): string {
	if (pct < 10) return "Healthy";
	if (pct < 30) return "Partially Bleached";
	return "Bleached";
}

export interface BleachingResult {
	annotationId: number;
	bleachingPct: number;
}

/**
 * Computes bleaching percentages for multiple annotations.
 * Loads the image and calculates bleaching for each annotation's mask.
 * @param imageUrl - URL of the image to analyze
 * @param annotations - Array of annotations to analyze
 * @param width - Image width
 * @param height - Image height
 * @returns Array of bleaching percentages in the same order as annotations
 */
export async function computeBleachingPercentages(
	imageUrl: string,
	annotations: Annotation[],
	width: number,
	height: number,
): Promise<number[]> {
	const img = new Image();
	await new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej();
		img.src = imageUrl;
	});
	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const ctx = offscreen.getContext("2d")!;
	ctx.drawImage(img, 0, 0, width, height);
	const pixelData = ctx.getImageData(0, 0, width, height);
	return annotations.map((ann) => {
		const mask = decodeRLE(ann.segmentation);
		return calculateBleaching(pixelData, mask);
	});
}

/**
 * Calculates the combined bounding box for multiple masks.
 * @param annotations - Array of annotations
 * @param imageWidth - Width of the image
 * @param imageHeight - Height of the image
 * @returns Combined bounding box or null if no valid masks
 */
export function getCombinedBoundingBox(
	annotations: Annotation[],
	imageWidth: number,
	imageHeight: number,
): BoundingBox | null {
	let minX = imageWidth,
		minY = imageHeight,
		maxX = -1,
		maxY = -1;

	for (const ann of annotations) {
		const mask = decodeRLE(ann.segmentation);
		const bb = getMaskBoundingBox(mask, imageWidth);
		if (!bb) continue;
		if (bb.minX < minX) minX = bb.minX;
		if (bb.minY < minY) minY = bb.minY;
		if (bb.maxX > maxX) maxX = bb.maxX;
		if (bb.maxY > maxY) maxY = bb.maxY;
	}

	if (maxX < 0) return null;
	return { minX, minY, maxX, maxY };
}
