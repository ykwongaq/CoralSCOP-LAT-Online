import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import CoralWatchLogo from "../../../assets/CoralWatchLogo.png";
import type { Data, CoralWatchCard, Point } from "../../../types";

import styles from "./CoralWatchPicker.module.css";

export interface CoralWatchPickerProps {
	data: Data;
	onClose: () => void;
	onConfirm: (card: CoralWatchCard) => void;
}

const CORNER_LABELS = ["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"];
const CORNER_COLORS = ["#425df9", "#00dfd4", "#7a9ae3", "#002a67"];

function getPerspectiveTransform(src: Point[], dst: Point[]): number[] {
	const A: number[][] = [];
	for (let i = 0; i < 4; i++) {
		A.push([
			src[i].x,
			src[i].y,
			1,
			0,
			0,
			0,
			-dst[i].x * src[i].x,
			-dst[i].x * src[i].y,
		]);
		A.push([
			0,
			0,
			0,
			src[i].x,
			src[i].y,
			1,
			-dst[i].y * src[i].x,
			-dst[i].y * src[i].y,
		]);
	}

	const b = [
		dst[0].x,
		dst[0].y,
		dst[1].x,
		dst[1].y,
		dst[2].x,
		dst[2].y,
		dst[3].x,
		dst[3].y,
	];

	const h = gaussianElimination(A, b);
	h.push(1);
	return h;
}

function gaussianElimination(A: number[][], b: number[]): number[] {
	const n = b.length;
	const augmented = A.map((row, i) => [...row, b[i]]);

	// Forward elimination
	for (let i = 0; i < n; i++) {
		let maxRow = i;
		for (let k = i + 1; k < n; k++) {
			if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
				maxRow = k;
			}
		}
		[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

		for (let k = i + 1; k < n; k++) {
			const factor = augmented[k][i] / augmented[i][i];
			for (let j = i; j <= n; j++) {
				augmented[k][j] -= factor * augmented[i][j];
			}
		}
	}

	// Back substitution
	const x = new Array(n);
	for (let i = n - 1; i >= 0; i--) {
		x[i] = augmented[i][n];
		for (let j = i + 1; j < n; j++) {
			x[i] -= augmented[i][j] * x[j];
		}
		x[i] /= augmented[i][i];
	}

	return x;
}

function applyMatrix(matrix: number[], x: number, y: number): Point {
	const w = matrix[6] * x + matrix[7] * y + 1;
	return {
		x: (matrix[0] * x + matrix[1] * y + matrix[2]) / w,
		y: (matrix[3] * x + matrix[4] * y + matrix[5]) / w,
	};
}

function getPixel(
	imageData: ImageData,
	x: number,
	y: number
): { r: number; g: number; b: number; a: number } {
	const idx = (y * imageData.width + x) * 4;
	return {
		r: imageData.data[idx],
		g: imageData.data[idx + 1],
		b: imageData.data[idx + 2],
		a: imageData.data[idx + 3],
	};
}

function getPixelBilinear(
	imageData: ImageData,
	x: number,
	y: number
): { r: number; g: number; b: number; a: number } {
	const x1 = Math.floor(x);
	const x2 = Math.ceil(x);
	const y1 = Math.floor(y);
	const y2 = Math.ceil(y);

	if (
		x1 < 0 ||
		x2 >= imageData.width ||
		y1 < 0 ||
		y2 >= imageData.height
	) {
		return { r: 255, g: 255, b: 255, a: 255 };
	}

	const dx = x - x1;
	const dy = y - y1;

	const c11 = getPixel(imageData, x1, y1);
	const c21 = getPixel(imageData, x2, y1);
	const c12 = getPixel(imageData, x1, y2);
	const c22 = getPixel(imageData, x2, y2);

	return {
		r: Math.round(
			c11.r * (1 - dx) * (1 - dy) +
				c21.r * dx * (1 - dy) +
				c12.r * (1 - dx) * dy +
				c22.r * dx * dy
		),
		g: Math.round(
			c11.g * (1 - dx) * (1 - dy) +
				c21.g * dx * (1 - dy) +
				c12.g * (1 - dx) * dy +
				c22.g * dx * dy
		),
		b: Math.round(
			c11.b * (1 - dx) * (1 - dy) +
				c21.b * dx * (1 - dy) +
				c12.b * (1 - dx) * dy +
				c22.b * dx * dy
		),
		a: Math.round(
			c11.a * (1 - dx) * (1 - dy) +
				c21.a * dx * (1 - dy) +
				c12.a * (1 - dx) * dy +
				c22.a * dx * dy
		),
	};
}

const OUTPUT_WIDTH = 512;
const OUTPUT_HEIGHT = 512;

export function CoralWatchPicker({
	data,
	onClose,
	onConfirm,
}: CoralWatchPickerProps) {
	const [corners, setCorners] = useState<Point[]>([]);
	const [showPreview, setShowPreview] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
	const previewCanvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const displayScaleRef = useRef<{ scaleX: number; scaleY: number }>({
		scaleX: 1,
		scaleY: 1,
	});

	const drawSourceCanvas = useCallback(() => {
		const canvas = sourceCanvasRef.current;
		const image = imageRef.current;
		if (!canvas || !image) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

		// Draw corner markers
		corners.forEach((corner, index) => {
			const scaledX = corner.x * displayScaleRef.current.scaleX;
			const scaledY = corner.y * displayScaleRef.current.scaleY;

			// Draw circle
			ctx.beginPath();
			ctx.arc(scaledX, scaledY, 8, 0, 2 * Math.PI);
			ctx.fillStyle = CORNER_COLORS[index];
			ctx.fill();
			ctx.strokeStyle = "white";
			ctx.lineWidth = 3;
			ctx.stroke();

			// Draw number
			ctx.fillStyle = "white";
			ctx.font = "bold 14px Arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText((index + 1).toString(), scaledX, scaledY);

			// Draw lines between points
			if (index > 0) {
				const prevCorner = corners[index - 1];
				const prevScaledX = prevCorner.x * displayScaleRef.current.scaleX;
				const prevScaledY = prevCorner.y * displayScaleRef.current.scaleY;
				ctx.beginPath();
				ctx.moveTo(prevScaledX, prevScaledY);
				ctx.lineTo(scaledX, scaledY);
				ctx.strokeStyle = CORNER_COLORS[index];
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		});

		// Close the polygon
		if (corners.length === 4) {
			const scaledX0 = corners[0].x * displayScaleRef.current.scaleX;
			const scaledY0 = corners[0].y * displayScaleRef.current.scaleY;
			const scaledX3 = corners[3].x * displayScaleRef.current.scaleX;
			const scaledY3 = corners[3].y * displayScaleRef.current.scaleY;
			ctx.beginPath();
			ctx.moveTo(scaledX3, scaledY3);
			ctx.lineTo(scaledX0, scaledY0);
			ctx.strokeStyle = CORNER_COLORS[3];
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}, [corners]);

	// Load image
	useEffect(() => {
		const image = new Image();
		image.onload = () => {
			imageRef.current = image;
			const canvas = sourceCanvasRef.current;
			if (!canvas) return;

			const maxWidth = 520;
			const scale = Math.min(1, maxWidth / image.width);
			canvas.width = image.width * scale;
			canvas.height = image.height * scale;

			displayScaleRef.current = { scaleX: scale, scaleY: scale };

			setImageLoaded(true);
		};
		image.src = data.imageData.imageUrl;
	}, [data.imageData.imageUrl]);

	// Clear corners when image URL changes
	useEffect(() => {
		setCorners([]);
		setShowPreview(false);
	}, [data.imageData.imageUrl]);

	// Redraw when corners or image change
	useEffect(() => {
		drawSourceCanvas();
	}, [corners, drawSourceCanvas, imageLoaded]);

	// Run perspective transform when all 4 corners are set
	useEffect(() => {
		if (corners.length !== 4) return;

		const previewCanvas = previewCanvasRef.current;
		if (!previewCanvas) return;

		const image = imageRef.current;
		if (!image) return;

		// Destination corners (perfect rectangle)
		const dstCorners: Point[] = [
			{ x: 0, y: 0 },
			{ x: OUTPUT_WIDTH, y: 0 },
			{ x: OUTPUT_WIDTH, y: OUTPUT_HEIGHT },
			{ x: 0, y: OUTPUT_HEIGHT },
		];

		const matrix = getPerspectiveTransform(dstCorners, corners);

		// Create temporary canvas with original image data
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = image.width;
		tempCanvas.height = image.height;
		const tempCtx = tempCanvas.getContext("2d");
		if (!tempCtx) return;
		tempCtx.drawImage(image, 0, 0);
		const srcImageData = tempCtx.getImageData(0, 0, image.width, image.height);

		// Create output image data
		const ctx = previewCanvas.getContext("2d");
		if (!ctx) return;
		previewCanvas.width = OUTPUT_WIDTH;
		previewCanvas.height = OUTPUT_HEIGHT;
		const outputImageData = ctx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);

		// Apply transformation
		for (let y = 0; y < OUTPUT_HEIGHT; y++) {
			for (let x = 0; x < OUTPUT_WIDTH; x++) {
				const srcPoint = applyMatrix(matrix, x, y);
				const color = getPixelBilinear(srcImageData, srcPoint.x, srcPoint.y);

				const dstIdx = (y * OUTPUT_WIDTH + x) * 4;
				outputImageData.data[dstIdx] = color.r;
				outputImageData.data[dstIdx + 1] = color.g;
				outputImageData.data[dstIdx + 2] = color.b;
				outputImageData.data[dstIdx + 3] = color.a;
			}
		}

		ctx.putImageData(outputImageData, 0, 0);
		setShowPreview(true);
	}, [corners]);

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (corners.length >= 4 || !imageRef.current) return;

		const canvas = sourceCanvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
		const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

		const originalX = canvasX / displayScaleRef.current.scaleX;
		const originalY = canvasY / displayScaleRef.current.scaleY;

		setCorners([...corners, { x: originalX, y: originalY }]);
	};

	const handleConfirm = () => {
		if (corners.length !== 4) return;
		const [topLeft, topRight, bottomRight, bottomLeft] = corners;
		onConfirm({
			topLeft,
			topRright: topRight,
			bottomRight,
			bottomLeft,
		});
	};

	const handleReset = () => {
		setCorners([]);
		setShowPreview(false);
	};

	return createPortal(
		<div className={styles.backdrop} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<img src={CoralWatchLogo} alt="CoralWatch" className={styles.logo} />
					<h2 className={styles.title}>CoralWatch Card Picker</h2>
				</div>

				<div className={styles.instructions}>
					<p className={styles.instructionText}>
						Click the 4 corners of the card in order:
						<strong> Top-Left → Top-Right → Bottom-Right → Bottom-Left</strong>
					</p>
					<div className={styles.cornerChips}>
						{CORNER_LABELS.map((label, index) => (
							<div
								key={index}
								className={`${styles.chip} ${
									index < corners.length ? styles.completed : ""
								}`}
								style={{
									backgroundColor:
										index < corners.length ? CORNER_COLORS[index] : "#e5e7eb",
								}}
							>
								<span className={styles.chipLabel}>{label}</span>
								{index < corners.length && (
									<span className={styles.checkmark}>✓</span>
								)}
							</div>
						))}
					</div>
				</div>

				<div className={styles.canvasArea}>
					<div className={styles.sourcePanel}>
						<label className={styles.canvasLabel}>Source Image</label>
						<canvas
							ref={sourceCanvasRef}
							className={styles.sourceCanvas}
							onClick={handleCanvasClick}
						/>
					</div>

					<div
						className={`${styles.previewPanel} ${
							showPreview ? styles.visible : ""
						}`}
					>
						<label className={styles.canvasLabel}>Extracted Card</label>
						<canvas ref={previewCanvasRef} className={styles.previewCanvas} />
					</div>
				</div>

				<div className={styles.footer}>
					<button className={styles.cancelBtn} onClick={onClose}>
						Cancel
					</button>
					<button
						className={styles.resetBtn}
						onClick={handleReset}
						disabled={corners.length === 0}
					>
						Reset
					</button>
					<button
						className={styles.confirmBtn}
						onClick={handleConfirm}
						disabled={corners.length !== 4}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}

export default CoralWatchPicker;
