import { useRef, useEffect, useCallback, useState } from "react";
import { useProject } from "../../features/ProjectAnnotation/context";
import { useVisualizationSetting } from "../../features/VisualizationSetting/context";
import type { Data } from "../../types/Annotation/Data";
import { decodeRleMasks } from "../../utils/cocoRle";
import { hexToRgb } from "../../utils/color";
import { getLabelColor, getTextColor } from "../common/LabelColorMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Viewport = {
	scale: number;
	originX: number;
	originY: number;
};

type Layers = {
	mask: HTMLCanvasElement;
	border: HTMLCanvasElement;
	text: HTMLCanvasElement;
};

// ---------------------------------------------------------------------------
// Layer builder — pure function, no React, called once per data change
// ---------------------------------------------------------------------------

async function buildLayers(data: Data): Promise<Layers> {
	// Dimensions from explicit ImageData fields, or fall back to COCO RLE size
	const width =
		data.imageData.width ?? data.annotations[0]?.segmentation.size[1] ?? 0;
	const height =
		data.imageData.height ?? data.annotations[0]?.segmentation.size[0] ?? 0;

	const maskCanvas = document.createElement("canvas");
	const borderCanvas = document.createElement("canvas");
	const textCanvas = document.createElement("canvas");

	maskCanvas.width = borderCanvas.width = textCanvas.width = width;
	maskCanvas.height = borderCanvas.height = textCanvas.height = height;

	const maskCtx = maskCanvas.getContext("2d", {
		willReadFrequently: true,
	})!;
	const borderCtx = borderCanvas.getContext("2d")!;
	const textCtx = textCanvas.getContext("2d")!;

	// Build mask + border via ImageData for efficiency (single putImageData each)
	const maskImgData = maskCtx.getImageData(0, 0, width, height);
	const borderImgData = borderCtx.getImageData(0, 0, width, height);
	const md = maskImgData.data;
	const bd = borderImgData.data;

	const centroids: Array<{ cx: number; cy: number; labelId: number }> = [];

	// Batch-decode all masks via backend in a single request
	const pixelMasks = await decodeRleMasks(
		data.annotations.map((ann) => ann.segmentation),
	);

	for (let annIdx = 0; annIdx < data.annotations.length; annIdx++) {
		const ann = data.annotations[annIdx];
		const color = getLabelColor(ann.labelId);
		console.log(
			`Building layer for annotation ${ann.id} with label ${ann.labelId} and color ${color}`,
		);
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

			// Fill mask area
			md[idx] = r;
			md[idx + 1] = g;
			md[idx + 2] = b;
			md[idx + 3] = 255;

			// Detect boundary pixels
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

	maskCtx.putImageData(maskImgData, 0, 0);
	borderCtx.putImageData(borderImgData, 0, 0);

	// Draw label badges on the text canvas
	const minDim = Math.min(width, height);
	const badgeRadius = Math.min(Math.floor(minDim * 0.025), 20);
	const fontSize = Math.round(badgeRadius * 1.2);

	textCtx.textAlign = "center";
	textCtx.textBaseline = "middle";

	for (const { cx, cy, labelId } of centroids) {
		const color = getLabelColor(labelId);
		const textColor = getTextColor(labelId);

		const displayText = String(labelId);

		// Badge circle
		textCtx.beginPath();
		textCtx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
		textCtx.fillStyle = color;
		textCtx.strokeStyle = "#fff";
		textCtx.lineWidth = Math.max(1, badgeRadius * 0.12);
		textCtx.fill();
		textCtx.stroke();
		textCtx.closePath();

		// Label number
		const adjFontSize =
			displayText.length > 1 ? Math.floor(fontSize * 0.75) : fontSize;
		textCtx.font = `bold ${adjFontSize}px Arial`;
		textCtx.fillStyle = textColor;
		textCtx.fillText(displayText, cx, cy);
	}

	return { mask: maskCanvas, border: borderCanvas, text: textCanvas };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnotationCanvas() {
	const { state } = useProject();
	const { visualizationSetting } = useVisualizationSetting();

	// Always show the first data item (index 0) for now
	const data = state.dataList[0] ?? null;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// -----------------------------------------------------------------------
	// Rendering state — stored in refs so updates don't trigger re-renders
	// -----------------------------------------------------------------------
	const imageRef = useRef<HTMLImageElement | null>(null);
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const viewportRef = useRef<Viewport>({ scale: 1, originX: 0, originY: 0 });
	const layersRef = useRef<Layers | null>(null);

	// Keep a live ref to visualizationSetting so draw() always reads latest
	const vizRef = useRef(visualizationSetting);
	vizRef.current = visualizationSetting;

	// Interaction refs
	const isDraggingRef = useRef(false);
	const lastMouseRef = useRef({ x: 0, y: 0 });
	const rafRef = useRef(0);

	// React state only used to trigger effects after async image load
	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	// -----------------------------------------------------------------------
	// Core draw — reads everything from refs, safe to call from rAF
	// -----------------------------------------------------------------------
	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const { scale, originX, originY } = viewportRef.current;
		const viz = vizRef.current;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		// Transform: canvas coords = (image coords - origin) * scale
		ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);

		if (imageRef.current) {
			ctx.drawImage(imageRef.current, 0, 0);
		}

		if (viz.showMasks && layersRef.current) {
			ctx.globalAlpha = viz.maskOpacity;
			ctx.drawImage(layersRef.current.mask, 0, 0);
			ctx.globalAlpha = 1;
			ctx.drawImage(layersRef.current.border, 0, 0);
			ctx.drawImage(layersRef.current.text, 0, 0);
		}

		ctx.restore();
	}, []);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

	// -----------------------------------------------------------------------
	// Viewport reset — fits image into canvas with letterboxing
	// -----------------------------------------------------------------------
	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const rect = container.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const { width: imgW, height: imgH } = imageSizeRef.current;
		if (imgW === 0 || imgH === 0) return;

		const scale = Math.min(rect.width / imgW, rect.height / imgH);
		// Origin is the image-space coordinate shown at canvas (0, 0)
		const originX = -(rect.width / scale - imgW) / 2;
		const originY = -(rect.height / scale - imgH) / 2;

		viewportRef.current = { scale, originX, originY };
		requestDraw();
	}, [requestDraw]);

	// -----------------------------------------------------------------------
	// Effects
	// -----------------------------------------------------------------------

	// Load image when URL changes
	const imageUrl = data?.imageData.imageUrl ?? null;
	useEffect(() => {
		if (!imageUrl) {
			imageRef.current = null;
			setImageSize(null);
			return;
		}

		const img = new Image();
		img.onload = () => {
			imageRef.current = img;
			const size = { width: img.naturalWidth, height: img.naturalHeight };
			imageSizeRef.current = size;
			setImageSize(size);
		};
		img.src = imageUrl;
	}, [imageUrl]);

	// Reset viewport after image loads
	useEffect(() => {
		if (!imageSize) {
			requestDraw();
			return;
		}
		resetViewport();
	}, [imageSize, resetViewport, requestDraw]);

	// Rebuild layers when data or image size changes
	useEffect(() => {
		if (!data || !imageSize) {
			layersRef.current = null;
			requestDraw();
			return;
		}
		let cancelled = false;
		buildLayers(data)
			.then((layers) => {
				if (!cancelled) {
					layersRef.current = layers;
					requestDraw();
				}
			})
			.catch((err) => console.error("Failed to build layers:", err));
		return () => {
			cancelled = true;
		};
	}, [data, imageSize, requestDraw]);

	// Redraw when visualization settings change (opacity, showMasks, etc.)
	useEffect(() => {
		requestDraw();
	}, [visualizationSetting, requestDraw]);

	// Window resize
	useEffect(() => {
		window.addEventListener("resize", resetViewport);
		return () => window.removeEventListener("resize", resetViewport);
	}, [resetViewport]);

	// -----------------------------------------------------------------------
	// Wheel zoom — must be non-passive to call preventDefault
	// -----------------------------------------------------------------------
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const { scale, originX, originY } = viewportRef.current;
			const zoom = e.deltaY < 0 ? 1.1 : 0.9;
			const newScale = Math.max(0.05, Math.min(50, scale * zoom));

			// Keep the image point under the cursor fixed after zoom
			viewportRef.current = {
				scale: newScale,
				originX: mouseX / scale + originX - mouseX / newScale,
				originY: mouseY / scale + originY - mouseY / newScale,
			};

			requestDraw();
		},
		[requestDraw],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", handleWheel);
	}, [handleWheel]);

	// -----------------------------------------------------------------------
	// Pan — left-click drag
	// -----------------------------------------------------------------------
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		isDraggingRef.current = true;
		lastMouseRef.current = { x: e.clientX, y: e.clientY };
		if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDraggingRef.current) return;
			const dx = e.clientX - lastMouseRef.current.x;
			const dy = e.clientY - lastMouseRef.current.y;
			const { scale, originX, originY } = viewportRef.current;
			viewportRef.current = {
				scale,
				originX: originX - dx / scale,
				originY: originY - dy / scale,
			};
			lastMouseRef.current = { x: e.clientX, y: e.clientY };
			requestDraw();
		},
		[requestDraw],
	);

	const handleMouseUp = useCallback(() => {
		isDraggingRef.current = false;
		if (canvasRef.current) canvasRef.current.style.cursor = "grab";
	}, []);

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
	return (
		<div
			ref={containerRef}
			style={{ position: "relative", flex: 1, overflow: "hidden" }}
		>
			<div className="canvas-container">
				<canvas
					ref={canvasRef}
					className="canvas"
					style={{ cursor: "grab", display: "block" }}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
				/>
			</div>
		</div>
	);
}
