import type { Annotation, Data } from "../types/Annotation";
import { decodeRleMasks } from "./cocoRle";
import { hexToRgb } from "./color";
import {
	getLabelColor,
	getSelectedMaskColor,
	getTextColor,
} from "../components/common/LabelColorMap";
import type AnnotationSessionState from "../types/Annotation/AnnotationSession";

let buildLayersTimerId = 0;
let hitTestMaskTimerId = 0;
let rectIntersectTimerId = 0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Layers = {
	mask: HTMLCanvasElement;
	border: HTMLCanvasElement;
	text: HTMLCanvasElement;
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
): Promise<LayersResult> {
	const buildLabel = `buildLayers.total#${++buildLayersTimerId}`;
	console.time(buildLabel);
	console.time(`${buildLabel}:setup`);
	const width =
		data.imageData.width ?? data.annotations[0]?.segmentation.size[1] ?? 0;
	const height =
		data.imageData.height ?? data.annotations[0]?.segmentation.size[0] ?? 0;

	const maskCanvas = document.createElement("canvas");
	const borderCanvas = document.createElement("canvas");
	const textCanvas = document.createElement("canvas");

	maskCanvas.width = borderCanvas.width = textCanvas.width = width;
	maskCanvas.height = borderCanvas.height = textCanvas.height = height;

	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
	const borderCtx = borderCanvas.getContext("2d")!;
	const textCtx = textCanvas.getContext("2d")!;

	const maskImgData = maskCtx.getImageData(0, 0, width, height);
	const borderImgData = borderCtx.getImageData(0, 0, width, height);
	const md = maskImgData.data;
	const bd = borderImgData.data;
	console.timeEnd(`${buildLabel}:setup`);

	const centroids: Array<{ cx: number; cy: number; labelId: number }> = [];

	console.time(`${buildLabel}:decodeRleMasks`);
	const pixelMasks = await decodeRleMasks(
		data.annotations.map((ann) => ann.segmentation),
	);
	console.timeEnd(`${buildLabel}:decodeRleMasks`);

	function isMaskSelected(annotation: Annotation): boolean {
		return annotationSessionState.selectedAnnotations.some(
			(sel) => sel === annotation.id,
		);
	}

	console.time(`${buildLabel}:paintMasksAndBorders`);
	for (let annIdx = 0; annIdx < data.annotations.length; annIdx++) {
		const ann = data.annotations[annIdx];
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
				bd[idx] = r;
				bd[idx + 1] = g;
				bd[idx + 2] = b;
				bd[idx + 3] = 255;
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
	console.timeEnd(`${buildLabel}:paintMasksAndBorders`);

	console.time(`${buildLabel}:putImageData`);
	maskCtx.putImageData(maskImgData, 0, 0);
	borderCtx.putImageData(borderImgData, 0, 0);
	console.timeEnd(`${buildLabel}:putImageData`);

	const minDim = Math.min(width, height);
	const badgeRadius = Math.min(Math.floor(minDim * 0.015), 20);
	const fontSize = Math.round(badgeRadius * 1.2);

	textCtx.textAlign = "center";
	textCtx.textBaseline = "middle";

	console.time(`${buildLabel}:drawLabels`);
	for (const { cx, cy, labelId } of centroids) {
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
	console.timeEnd(`${buildLabel}:drawLabels`);
	console.timeEnd(buildLabel);

	return {
		layers: { mask: maskCanvas, border: borderCanvas, text: textCanvas },
		pixelMasks,
	};
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
	const label = `hitTestMask#${++hitTestMaskTimerId}`;
	console.time(label);
	const px = Math.floor(imgX);
	const py = Math.floor(imgY);
	if (px < 0 || py < 0 || px >= width || py >= mask.length / width) {
		console.timeEnd(label);
		return false;
	}
	const hit = mask[py * width + px] === 1;
	console.timeEnd(label);
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
	const label = `maskIntersectsRect#${++rectIntersectTimerId}`;
	console.time(label);
	const minX = Math.max(0, Math.floor(Math.min(x0, x1)));
	const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1)));
	const minY = Math.max(0, Math.floor(Math.min(y0, y1)));
	const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1)));

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			if (mask[y * width + x] === 1) {
				console.timeEnd(label);
				return true;
			}
		}
	}
	console.timeEnd(label);
	return false;
}
