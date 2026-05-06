import { useRef, useEffect } from "react";
import { decodeRLE } from "../../../utils/cocoRle";
import type { Annotation } from "../../../types";
import { getMaskBoundingBox } from "../../../services/StatisticService";
import styles from "./CroppedCanvas.module.css";

interface CroppedCanvasProps {
	imageUrl: string;
	annotation: Annotation;
	imageWidth: number;
	imageHeight: number;
}

interface ViewState {
	zoom: number;
	panX: number;
	panY: number;
	offCanvas: HTMLCanvasElement | null;
	cropW: number;
	cropH: number;
	baseScale: number;
}

function clampPan(
	state: ViewState,
	containerWidth: number,
	containerHeight: number
) {
	const scaledW = state.cropW * state.baseScale;
	const scaledH = state.cropH * state.baseScale;
	const drawW = scaledW * state.zoom;
	const drawH = scaledH * state.zoom;
	const maxPanX = Math.max(0, (drawW - containerWidth) / 2);
	const maxPanY = Math.max(0, (drawH - containerHeight) / 2);
	state.panX = Math.max(-maxPanX, Math.min(maxPanX, state.panX));
	state.panY = Math.max(-maxPanY, Math.min(maxPanY, state.panY));
}

/**
 * A canvas component that displays a cropped region of the image
 * showing only the specified annotation mask.
 * Supports zoom (scroll) and pan (drag) interactions.
 */
export default function CroppedCanvas({
	imageUrl,
	annotation,
	imageWidth,
	imageHeight,
}: CroppedCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<ViewState>({
		zoom: 1,
		panX: 0,
		panY: 0,
		offCanvas: null,
		cropW: 0,
		cropH: 0,
		baseScale: 0,
	});
	const drawRef = useRef(() => {});

	drawRef.current = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const state = stateRef.current;
		if (!state.offCanvas || state.cropW === 0 || state.cropH === 0) return;

		const rect = canvas.getBoundingClientRect();
		const containerWidth = rect.width || 260;
		const containerHeight = rect.height || 220;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = containerWidth * dpr;
		canvas.height = containerHeight * dpr;

		state.baseScale = Math.min(
			containerWidth / state.cropW,
			containerHeight / state.cropH
		);

		const ctx = canvas.getContext("2d")!;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, containerWidth, containerHeight);

		const scaledW = state.cropW * state.baseScale;
		const scaledH = state.cropH * state.baseScale;
		const drawW = scaledW * state.zoom;
		const drawH = scaledH * state.zoom;
		const offsetX = (containerWidth - scaledW) / 2;
		const offsetY = (containerHeight - scaledH) / 2;

		clampPan(state, containerWidth, containerHeight);

		ctx.drawImage(
			state.offCanvas,
			0,
			0,
			state.cropW,
			state.cropH,
			offsetX + state.panX - (drawW - scaledW) / 2,
			offsetY + state.panY - (drawH - scaledH) / 2,
			drawW,
			drawH
		);
	};

	// Load image and prepare masked offscreen canvas
	useEffect(() => {
		if (!imageUrl || !annotation) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			// Decode the RLE mask and get bounding box for single annotation
			const mask = decodeRLE(annotation.segmentation);
			const bb = getMaskBoundingBox(mask, imageWidth);
			if (!bb) return;

			const { minX, minY, maxX, maxY } = bb;
			const maskWidth = maxX - minX;
			const maskHeight = maxY - minY;

			// Minimal padding - only 3% of mask dimensions
			const pad = Math.ceil(Math.max(maskWidth, maskHeight) * 0.03);
			const cropX = Math.max(0, minX - pad);
			const cropY = Math.max(0, minY - pad);
			const cropW = Math.min(imageWidth, maxX + pad) - cropX;
			const cropH = Math.min(imageHeight, maxY + pad) - cropY;

			// Create offscreen canvas to apply mask transparency at original resolution
			const offCanvas = document.createElement("canvas");
			offCanvas.width = cropW;
			offCanvas.height = cropH;
			const offCtx = offCanvas.getContext("2d")!;
			offCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

			// Apply mask: set non-segmented pixels to transparent
			const imgData = offCtx.getImageData(0, 0, cropW, cropH);
			const data = imgData.data;
			for (let y = 0; y < cropH; y++) {
				for (let x = 0; x < cropW; x++) {
					const origX = cropX + x;
					const origY = cropY + y;
					const maskIdx = origY * imageWidth + origX;
					if (!mask[maskIdx]) {
						const pixelIdx = (y * cropW + x) * 4;
						data[pixelIdx + 3] = 0; // alpha = 0
					}
				}
			}
			offCtx.putImageData(imgData, 0, 0);

			const state = stateRef.current;
			state.offCanvas = offCanvas;
			state.cropW = cropW;
			state.cropH = cropH;
			state.zoom = 1;
			state.panX = 0;
			state.panY = 0;

			drawRef.current();
		};
		img.src = imageUrl;
	}, [imageUrl, annotation, imageWidth, imageHeight]);

	// Setup zoom, pan, and resize interactions
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		let isDragging = false;
		let lastX = 0;
		let lastY = 0;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const state = stateRef.current;
			if (!state.offCanvas) return;

			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			const oldZoom = state.zoom;
			const newZoom = Math.min(
				Math.max(oldZoom * Math.exp(-e.deltaY * 0.001), 1),
				10
			);

			const scaledW = state.cropW * state.baseScale;
			const scaledH = state.cropH * state.baseScale;
			const oldDrawW = scaledW * oldZoom;
			const oldDrawH = scaledH * oldZoom;
			const oldOffsetX = (rect.width - scaledW) / 2;
			const oldOffsetY = (rect.height - scaledH) / 2;
			const oldDrawX =
				oldOffsetX + state.panX - (oldDrawW - scaledW) / 2;
			const oldDrawY =
				oldOffsetY + state.panY - (oldDrawH - scaledH) / 2;

			const nx =
				oldDrawW > 0 ? (mx - oldDrawX) / oldDrawW : 0.5;
			const ny =
				oldDrawH > 0 ? (my - oldDrawY) / oldDrawH : 0.5;

			const newDrawW = scaledW * newZoom;
			const newDrawH = scaledH * newZoom;
			const newOffsetX = (rect.width - scaledW) / 2;
			const newOffsetY = (rect.height - scaledH) / 2;

			const newDrawX = mx - nx * newDrawW;
			const newDrawY = my - ny * newDrawH;

			state.panX =
				newDrawX - newOffsetX + (newDrawW - scaledW) / 2;
			state.panY =
				newDrawY - newOffsetY + (newDrawH - scaledH) / 2;
			state.zoom = newZoom;

			clampPan(state, rect.width, rect.height);
			drawRef.current();
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (e.button !== 2) return; // right mouse button only
			isDragging = true;
			lastX = e.clientX;
			lastY = e.clientY;
			canvas.style.cursor = "grabbing";
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return;
			const dx = e.clientX - lastX;
			const dy = e.clientY - lastY;
			lastX = e.clientX;
			lastY = e.clientY;

			const state = stateRef.current;
			state.panX += dx;
			state.panY += dy;

			const rect = canvas.getBoundingClientRect();
			clampPan(state, rect.width, rect.height);
			drawRef.current();
		};

		const handleMouseUp = () => {
			isDragging = false;
			canvas.style.cursor = "grab";
		};

		const handleContextMenu = (e: MouseEvent) => {
			e.preventDefault();
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (!isDragging || e.touches.length !== 1) return;
			e.preventDefault();
			const dx = e.touches[0].clientX - lastX;
			const dy = e.touches[0].clientY - lastY;
			lastX = e.touches[0].clientX;
			lastY = e.touches[0].clientY;

			const state = stateRef.current;
			state.panX += dx;
			state.panY += dy;

			const rect = canvas.getBoundingClientRect();
			clampPan(state, rect.width, rect.height);
			drawRef.current();
		};

		const handleTouchEnd = () => {
			isDragging = false;
		};

		const handleDoubleClick = () => {
			const state = stateRef.current;
			state.zoom = 1;
			state.panX = 0;
			state.panY = 0;
			drawRef.current();
		};

		const handleResize = () => {
			drawRef.current();
		};

		canvas.addEventListener("wheel", handleWheel, { passive: false });
		canvas.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		canvas.addEventListener("dblclick", handleDoubleClick);
		canvas.addEventListener("contextmenu", handleContextMenu);
		window.addEventListener("resize", handleResize);

		return () => {
			canvas.removeEventListener("wheel", handleWheel);
			canvas.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			canvas.removeEventListener("dblclick", handleDoubleClick);
			canvas.removeEventListener("contextmenu", handleContextMenu);
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className={styles.statCropCanvas}
			style={{ cursor: "grab", touchAction: "none" }}
		/>
	);
}
