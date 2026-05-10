import { useRef, useEffect, useCallback } from "react";
import type { Annotation } from "../../../types";
import type { ColorClassificationResult } from "../../../services";
import { getMaskBoundingBox } from "../../../services";
import { decodeRLE } from "../../../utils/cocoRle";
import { colorToHex } from "../../../utils/color";

import styles from "./CroppedCanvas.module.css";

interface Props {
	imageUrl: string;
	annotation: Annotation;
	imageWidth: number;
	imageHeight: number;
	colorClassification?: ColorClassificationResult[] | null;
}

interface Viewport {
	scale: number;
	offsetX: number;
	offsetY: number;
}

interface GridCell {
	label: string;
	row: number;
	col: number;
}

function getGridPositions(): GridCell[] {
	const cells: GridCell[] = [];

	// B row (top)
	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `B${i}`, row: 0, col: i - 1 });
	}

	// C column (right)
	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `C${i}`, row: i - 1, col: 6 });
	}

	// D row (bottom)
	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `D${i}`, row: 6, col: 7 - i });
	}

	// E column (left)
	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `E${i}`, row: 7 - i, col: 0 });
	}

	return cells;
}

export default function CroppedCanvas({
	imageUrl,
	annotation,
	imageWidth,
	imageHeight,
	colorClassification,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const maskRef = useRef<Uint8Array | null>(null);
	const boundingBoxRef = useRef<{
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	} | null>(null);
	const viewportRef = useRef<Viewport>({ scale: 1, offsetX: 0, offsetY: 0 });
	const rafRef = useRef(0);
	const isRightMouseDownRef = useRef(false);
	const lastMousePosRef = useRef({ x: 0, y: 0 });

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !imageRef.current || !maskRef.current) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const mask = maskRef.current;
		const bbox = boundingBoxRef.current;
		if (!bbox) return;

		const { scale, offsetX, offsetY } = viewportRef.current;

		// Create masked image
		const offscreenCanvas = document.createElement("canvas");
		offscreenCanvas.width = imageWidth;
		offscreenCanvas.height = imageHeight;
		const offscreenCtx = offscreenCanvas.getContext("2d");
		if (!offscreenCtx) return;

		offscreenCtx.drawImage(imageRef.current, 0, 0);
		const pixelData = offscreenCtx.getImageData(0, 0, imageWidth, imageHeight);
		const data = pixelData.data;

		// Apply mask
		for (let i = 0; i < mask.length; i++) {
			if (mask[i] !== 1) {
				const idx = i * 4;
				data[idx + 3] = 0;
			}
		}

		offscreenCtx.putImageData(pixelData, 0, 0);

		// Get dimensions
		const bboxWidth = bbox.maxX - bbox.minX + 1;
		const bboxHeight = bbox.maxY - bbox.minY + 1;

		// Apply viewport transform
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.scale(scale, scale);
		ctx.translate(-offsetX, -offsetY);

		// Draw masked image centered
		const centerX = (canvas.width / scale / 2) - bboxWidth / 2;
		const centerY = (canvas.height / scale / 2) - bboxHeight / 2;

		ctx.drawImage(
			offscreenCanvas,
			bbox.minX,
			bbox.minY,
			bboxWidth,
			bboxHeight,
			centerX,
			centerY,
			bboxWidth,
			bboxHeight,
		);

		ctx.restore();
	}, [imageWidth, imageHeight]);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		canvas.width = Math.round(rect.width);
		canvas.height = Math.round(rect.height);

		const bbox = boundingBoxRef.current;
		if (!bbox) return;

		const bboxWidth = bbox.maxX - bbox.minX + 1;
		const bboxHeight = bbox.maxY - bbox.minY + 1;

		const scale = Math.min(rect.width / bboxWidth, rect.height / bboxHeight) * 0.95;

		viewportRef.current = {
			scale,
			offsetX: bboxWidth / 2,
			offsetY: bboxHeight / 2,
		};
		// Draw immediately so user sees the coral right away
		draw();
	}, [draw]);

	// Load image and decode mask
	useEffect(() => {
		const loadImageAndMask = async () => {
			const img = new Image();
			await new Promise<void>((res, rej) => {
				img.onload = () => res();
				img.onerror = () => rej();
				img.src = imageUrl;
			});

			imageRef.current = img;
			const mask = decodeRLE(annotation.segmentation);
			maskRef.current = mask;

			const bbox = getMaskBoundingBox(mask, imageWidth);
			boundingBoxRef.current = bbox;

			resetViewport();
		};

		loadImageAndMask();
	}, [imageUrl, annotation, imageWidth, resetViewport]);

	useEffect(() => {
		window.addEventListener("resize", resetViewport);
		return () => window.removeEventListener("resize", resetViewport);
	}, [resetViewport]);

	// Mouse wheel zoom
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			const { scale, offsetX, offsetY } = viewportRef.current;

			const zoom = e.deltaY < 0 ? 1.1 : 0.9;
			const newScale = Math.max(0.1, Math.min(10, scale * zoom));

			viewportRef.current = {
				scale: newScale,
				offsetX,
				offsetY,
			};

			requestDraw();
		},
		[requestDraw],
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (e.button === 2) {
				isRightMouseDownRef.current = true;
				lastMousePosRef.current = { x: e.clientX, y: e.clientY };
			}
		},
		[],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isRightMouseDownRef.current) return;

			const dx = e.clientX - lastMousePosRef.current.x;
			const dy = e.clientY - lastMousePosRef.current.y;

			const { scale, offsetX, offsetY } = viewportRef.current;
			viewportRef.current = {
				scale,
				offsetX: offsetX - dx / scale,
				offsetY: offsetY - dy / scale,
			};

			lastMousePosRef.current = { x: e.clientX, y: e.clientY };
			requestDraw();
		},
		[requestDraw],
	);

	const handleMouseUp = useCallback(() => {
		isRightMouseDownRef.current = false;
	}, []);

	const handleMouseLeave = useCallback(() => {
		isRightMouseDownRef.current = false;
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.addEventListener("wheel", handleWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", handleWheel);
	}, [handleWheel]);

	useEffect(() => {
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [handleMouseUp, handleMouseLeave]);

	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	const colorMap = colorClassification
		? new Map(colorClassification.map((c) => [c.label, c]))
		: new Map();
	const gridCells = getGridPositions();

	return (
		<div className={styles.gridContainer}>
			{gridCells.map((cell) => {
				const colorData = colorMap.get(cell.label);
				const colorHex = colorData ? colorToHex(colorData.color) : "#e5e7eb";

				return (
					<div
						key={cell.label}
						className={styles.colorBox}
						style={{
							gridRow: cell.row + 1,
							gridColumn: cell.col + 1,
							backgroundColor: colorHex,
						}}
					>
						<div className={styles.colorBoxLabel}>{cell.label}</div>
					</div>
				);
			})}

			<div className={styles.canvasContainer}>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onContextMenu={(e) => e.preventDefault()}
				/>
			</div>
		</div>
	);
}
