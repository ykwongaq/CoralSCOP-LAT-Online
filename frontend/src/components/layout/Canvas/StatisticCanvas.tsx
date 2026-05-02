import { useRef, useEffect, useCallback, useState } from "react";

import {
	useAnnotationSession,
	useProject,
	useVisualizationSetting,
} from "../../../store";
import { type Annotation } from "../../../types";
import {
	type Layers,
	buildLayers,
	hitTestMask,
	maskIntersectsRect,
} from "../../../utils";
import { useCanvasInteraction, type CanvasAction } from "../../../hooks";
import styles from "./CanvasCommon.module.css";
type Viewport = { scale: number; originX: number; originY: number };

export default function StatisticCanvas() {
	const { projectState } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { visualizationSettingState } = useVisualizationSetting();

	const data =
		projectState.dataList[annotationSessionState.currentDataIndex] ?? null;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const viewportRef = useRef<Viewport>({ scale: 1, originX: 0, originY: 0 });
	const layersRef = useRef<Layers | null>(null);
	const pixelMasksRef = useRef<Uint8Array[] | null>(null);

	const vizRef = useRef(visualizationSettingState);
	vizRef.current = visualizationSettingState;

	const rafRef = useRef(0);
	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const { scale, originX, originY } = viewportRef.current;
		const viz = vizRef.current;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
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

		if (selectionRectRef.current) {
			const { startX, startY, endX, endY } = selectionRectRef.current;
			const x = Math.min(startX, endX);
			const y = Math.min(startY, endY);
			const w = Math.abs(endX - startX);
			const h = Math.abs(endY - startY);
			ctx.strokeStyle = "rgba(0, 120, 255, 0.9)";
			ctx.fillStyle = "rgba(0, 120, 255, 0.15)";
			ctx.lineWidth = 1 / scale;
			ctx.fillRect(x, y, w, h);
			ctx.strokeRect(x, y, w, h);
		}

		ctx.restore();
	}, []);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

	const onCanvasAction = useCallback(
		(action: CanvasAction) => {
			const masks = pixelMasksRef.current;
			const annotations = data?.annotations ?? [];
			const { width, height } = imageSizeRef.current;

			switch (action.type) {
				case "hit-test": {
					if (!masks) {
						annotationSessionDispatch({ type: "CLEAR_SELECTION" });
						return;
					}
					let hit: Annotation | null = null;
					for (let i = 0; i < annotations.length; i++) {
						if (hitTestMask(masks[i], width, action.imgX, action.imgY)) {
							hit = annotations[i];
							break;
						}
					}
					if (hit) {
						annotationSessionDispatch({
							type: "TOGGLE_ANNOTATION_SELECTION",
							payload: { annIds: [hit.id] },
						});
					} else {
						annotationSessionDispatch({ type: "CLEAR_SELECTION" });
					}
					break;
				}
				case "rect-select": {
					if (!masks) return;
					const selectedIds = annotations
						.map((ann) => ann.id)
						.filter((_, i) =>
							maskIntersectsRect(
								masks[i],
								width,
								height,
								action.x0,
								action.y0,
								action.x1,
								action.y1,
							),
						);
					annotationSessionDispatch({
						type: "TOGGLE_ANNOTATION_SELECTION",
						payload: { annIds: selectedIds },
					});
					break;
				}
				default:
					return;
			}
		},
		[data, annotationSessionDispatch],
	);

	const {
		selectionRectRef,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		handleContextMenu,
	} = useCanvasInteraction(
		"select",
		canvasRef,
		viewportRef,
		imageSizeRef,
		requestDraw,
		onCanvasAction,
	);

	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const { width: imgW, height: imgH } = imageSizeRef.current;
		if (imgW === 0 || imgH === 0) return;

		const scale = Math.min(rect.width / imgW, rect.height / imgH);
		const originX = -(rect.width / scale - imgW) / 2;
		const originY = -(rect.height / scale - imgH) / 2;
		viewportRef.current = { scale, originX, originY };
		requestDraw();
	}, [requestDraw]);

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
		img.onerror = () => {};
		img.src = imageUrl;
	}, [imageUrl]);

	useEffect(() => {
		if (!imageSize) {
			requestDraw();
			return;
		}
		resetViewport();
	}, [imageSize, resetViewport, requestDraw]);

	useEffect(() => {
		if (!data || !imageSize) {
			layersRef.current = null;
			pixelMasksRef.current = null;
			requestDraw();
			return;
		}
		let cancelled = false;
		buildLayers(data, annotationSessionState, visualizationSettingState)
			.then(({ layers, pixelMasks }) => {
				if (!cancelled) {
					layersRef.current = layers;
					pixelMasksRef.current = pixelMasks;
					requestDraw();
				}
			})
			.catch((err) => console.error("Failed to build layers:", err));
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		data,
		imageSize,
		annotationSessionState.selectedAnnotations,
		requestDraw,
	]);

	useEffect(() => {
		requestDraw();
	}, [visualizationSettingState, requestDraw]);

	useEffect(() => {
		window.addEventListener("resize", resetViewport);
		return () => window.removeEventListener("resize", resetViewport);
	}, [resetViewport]);

	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

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

	return (
		<div
			ref={containerRef}
			style={{ position: "relative", flex: 1, overflow: "hidden" }}
		>
			<div
				className={styles.canvasContainer}
				style={{ backgroundColor: "var(--surface-surface-primary3)" }}
			>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					style={{ cursor: "default", display: "block" }}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onContextMenu={handleContextMenu}
				/>
			</div>
		</div>
	);
}
