import { decodeRLE, decodeRleMasks } from "./cocoRle";
import { hexToRgb } from "./color";
import type {
	Annotation,
	Data,
	AnnotationSessionState,
	PendingAnnotation,
	VisualizationSetting,
} from "../types";
import {
	getLabelColor,
	getPendingMaskColor,
	getSelectedMaskColor,
	getTextColor,
} from "./LabelColorMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Layers = {
	mask: HTMLCanvasElement;
	border: HTMLCanvasElement;
	text: HTMLCanvasElement;
	pendingMask: HTMLCanvasElement;
};

export type LayersResult = {
	layers: Layers;
	pixelMasks: Uint8Array[];
};

// ---------------------------------------------------------------------------
// Layer builder — pure function, no React, called once per data change
// ---------------------------------------------------------------------------

export async function buildLayers(
	data: Data,
	annotationSessionState: AnnotationSessionState,
	visualizationSetting: VisualizationSetting, // ADD THIS PARAMETER
): Promise<LayersResult> {
	const width =
		data.imageData.width ?? data.annotations[0]?.segmentation.size[1] ?? 0;
	const height =
		data.imageData.height ?? data.annotations[0]?.segmentation.size[0] ?? 0;

	const maskCanvas = document.createElement("canvas");
	const borderCanvas = document.createElement("canvas");
	const textCanvas = document.createElement("canvas");
	const pendingMaskCanvas = document.createElement("canvas");

	maskCanvas.width =
		borderCanvas.width =
		textCanvas.width =
		pendingMaskCanvas.width =
			width;
	maskCanvas.height =
		borderCanvas.height =
		textCanvas.height =
		pendingMaskCanvas.height =
			height;

	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
	const borderCtx = borderCanvas.getContext("2d")!;
	const textCtx = textCanvas.getContext("2d")!;

	const maskImgData = maskCtx.getImageData(0, 0, width, height);
	const borderImgData = borderCtx.getImageData(0, 0, width, height);
	const md = maskImgData.data;
	const bd = borderImgData.data;

	const centroids: Array<{ cx: number; cy: number; labelId: number }> = [];
	const edges: Array<{
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
	}> = [];

	const pixelMasks = await decodeRleMasks(
		data.annotations.map((ann) => ann.segmentation),
	);

	const hiddenLabelIds = new Set(
		visualizationSetting.hiddingLabels.map((label) => label.id),
	);

	function isMaskSelected(annotation: Annotation): boolean {
		return annotationSessionState.selectedAnnotations.some(
			(sel) => sel === annotation.id,
		);
	}

	function isLabelHidden(labelId: number): boolean {
		return hiddenLabelIds.has(labelId);
	}

	for (let annIdx = 0; annIdx < data.annotations.length; annIdx++) {
		const ann = data.annotations[annIdx];

		if (isLabelHidden(ann.labelId)) {
			continue;
		}

		const color = isMaskSelected(ann)
			? getSelectedMaskColor()
			: getLabelColor(ann.labelId);
		const [r, g, b] = hexToRgb(color);
		const pixelMask = pixelMasks[annIdx];

		let sumX = 0,
			sumY = 0,
			count = 0;

		for (let i = 0; i < pixelMask.length; i++) {
			if (pixelMask[i] !== 1) continue;

			const x = i % width;
			const y = Math.floor(i / width);
			const idx = i * 4;

			md[idx] = r;
			md[idx + 1] = g;
			md[idx + 2] = b;
			md[idx + 3] = 255;

			const isEdge =
				(x > 0 && pixelMask[i - 1] === 0) ||
				(x < width - 1 && pixelMask[i + 1] === 0) ||
				(y > 0 && pixelMask[i - width] === 0) ||
				(y < height - 1 && pixelMask[i + width] === 0);

			if (isEdge) {
				edges.push({ x, y, r, g, b });
			}

			sumX += x;
			sumY += y;
			count++;
		}

		if (count > 0) {
			centroids.push({
				cx: Math.round(sumX / count),
				cy: Math.round(sumY / count),
				labelId: ann.labelId,
			});
		}
	}

	const minDim = Math.min(width, height);
	const boundaryRadius = Math.max(1, Math.round(minDim * 0.0015));

	for (const { x, y, r, g, b } of edges) {
		for (let dy = -boundaryRadius; dy <= boundaryRadius; dy++) {
			for (let dx = -boundaryRadius; dx <= boundaryRadius; dx++) {
				const px = x + dx;
				const py = y + dy;
				if (px < 0 || px >= width || py < 0 || py >= height) continue;
				const pIdx = (py * width + px) * 4;
				bd[pIdx] = r;
				bd[pIdx + 1] = g;
				bd[pIdx + 2] = b;
				bd[pIdx + 3] = 255;
			}
		}
	}

	maskCtx.putImageData(maskImgData, 0, 0);
	borderCtx.putImageData(borderImgData, 0, 0);

	const badgeRadius = Math.max(4, Math.floor(minDim * 0.012));
	const fontSize = Math.round(badgeRadius * 1.2);

	textCtx.textAlign = "center";
	textCtx.textBaseline = "middle";

	for (const { cx, cy, labelId } of centroids) {
		// If the labelId < 0, it means the annotation has no label assigned, so we skip drawing the badge
		if (labelId < 0) continue;

		const color = getLabelColor(labelId);
		const textColor = getTextColor(labelId);
		const displayText = String(labelId + 1);

		textCtx.beginPath();
		textCtx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
		textCtx.fillStyle = color;
		textCtx.strokeStyle = "#fff";
		textCtx.lineWidth = Math.max(1, badgeRadius * 0.12);
		textCtx.fill();
		textCtx.stroke();
		textCtx.closePath();

		const adjFontSize =
			displayText.length > 1 ? Math.floor(fontSize * 0.75) : fontSize;
		textCtx.font = `bold ${adjFontSize}px Arial`;
		textCtx.fillStyle = textColor;
		textCtx.fillText(displayText, cx, cy);
	}

	return {
		layers: {
			mask: maskCanvas,
			border: borderCanvas,
			text: textCanvas,
			pendingMask: pendingMaskCanvas,
		},
		pixelMasks,
	};
}

// ---------------------------------------------------------------------------
// Pending mask layer — cheap repaint, called whenever pendingMask changes
// ---------------------------------------------------------------------------

export function updatePendingMaskLayer(
	canvas: HTMLCanvasElement,
	pendingAnnotation: PendingAnnotation | null,
	width: number,
	height: number,
): void {
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, width, height);

	if (pendingAnnotation === null) return;

	const pixelMask = decodeRLE(pendingAnnotation.segmentation);
	const [r, g, b] = hexToRgb(getPendingMaskColor());
	const imgData = ctx.createImageData(width, height);
	const d = imgData.data;

	for (let i = 0; i < pixelMask.length; i++) {
		if (pixelMask[i] !== 1) continue;

		const idx = i * 4;

		d[idx] = r;
		d[idx + 1] = g;
		d[idx + 2] = b;
		d[idx + 3] = 255;
	}

	ctx.putImageData(imgData, 0, 0);
}

// ---------------------------------------------------------------------------
// Hit-test helpers
// ---------------------------------------------------------------------------

export function hitTestMask(
	mask: Uint8Array,
	width: number,
	imgX: number,
	imgY: number,
): boolean {
	const px = Math.floor(imgX);
	const py = Math.floor(imgY);
	if (px < 0 || py < 0 || px >= width || py >= mask.length / width) {
		return false;
	}
	const hit = mask[py * width + px] === 1;
	return hit;
}

export function maskIntersectsRect(
	mask: Uint8Array,
	width: number,
	height: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): boolean {
	const minX = Math.max(0, Math.floor(Math.min(x0, x1)));
	const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1)));
	const minY = Math.max(0, Math.floor(Math.min(y0, y1)));
	const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1)));

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			if (mask[y * width + x] === 1) {
				return true;
			}
		}
	}
	return false;
}
