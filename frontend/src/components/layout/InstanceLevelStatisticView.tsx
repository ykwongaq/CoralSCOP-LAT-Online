import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { decodeRLE } from "../../utils/cocoRle";
import { getLabelColor } from "../common/LabelColorMap";
import type { Label, Data, Annotation } from "../../types/Annotation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaskBoundingBox(
	mask: Uint8Array,
	width: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
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

function calculateBleaching(pixelData: ImageData, mask: Uint8Array): number {
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

function bleachingStatus(pct: number): string {
	if (pct < 10) return "Healthy";
	if (pct < 30) return "Partially Bleached";
	return "Bleached";
}

// ---------------------------------------------------------------------------
// Cropped canvas showing the selected masks
// ---------------------------------------------------------------------------

function CroppedMaskCanvas({
	imageUrl,
	annotations,
	imageWidth,
	imageHeight,
}: {
	imageUrl: string;
	annotations: Annotation[];
	imageWidth: number;
	imageHeight: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!imageUrl || annotations.length === 0) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const img = new Image();
		img.onload = () => {
			const masks = annotations.map((ann) => decodeRLE(ann.segmentation));

			let minX = imageWidth,
				minY = imageHeight,
				maxX = -1,
				maxY = -1;
			for (const mask of masks) {
				const bb = getMaskBoundingBox(mask, imageWidth);
				if (!bb) continue;
				if (bb.minX < minX) minX = bb.minX;
				if (bb.minY < minY) minY = bb.minY;
				if (bb.maxX > maxX) maxX = bb.maxX;
				if (bb.maxY > maxY) maxY = bb.maxY;
			}
			if (maxX < 0) return;

			const pad = Math.max(20, Math.floor((maxX - minX + maxY - minY) * 0.05));
			const cropX = Math.max(0, minX - pad);
			const cropY = Math.max(0, minY - pad);
			const cropW = Math.min(imageWidth, maxX + pad) - cropX;
			const cropH = Math.min(imageHeight, maxY + pad) - cropY;

			canvas.width = cropW;
			canvas.height = cropH;
			const ctx = canvas.getContext("2d")!;
			ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

			for (let annIdx = 0; annIdx < annotations.length; annIdx++) {
				const mask = masks[annIdx];
				const color = getLabelColor(annotations[annIdx].labelId);
				const r = parseInt(color.slice(1, 3), 16);
				const g = parseInt(color.slice(3, 5), 16);
				const b = parseInt(color.slice(5, 7), 16);

				const overlayData = ctx.createImageData(cropW, cropH);
				const od = overlayData.data;
				for (let py = 0; py < cropH; py++) {
					for (let px = 0; px < cropW; px++) {
						const imgX = cropX + px;
						const imgY = cropY + py;
						if (imgX >= imageWidth || imgY >= imageHeight) continue;
						if (mask[imgY * imageWidth + imgX] !== 1) continue;
						const i = (py * cropW + px) * 4;
						od[i] = r;
						od[i + 1] = g;
						od[i + 2] = b;
						od[i + 3] = 100;
					}
				}
				ctx.putImageData(overlayData, 0, 0);
			}
		};
		img.src = imageUrl;
	}, [imageUrl, annotations, imageWidth, imageHeight]);

	return (
		<canvas
			ref={canvasRef}
			className="stat-crop-canvas"
		/>
	);
}

// ---------------------------------------------------------------------------
// Instance rows with async bleaching
// ---------------------------------------------------------------------------

interface InstanceRow {
	id: number;
	labelName: string;
	statuses: string[];
	bleachingPct: number | null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface Props {
	data: Data | null;
	labels: Label[];
	selectedIds: number[];
}

export default function InstanceLevelStatisticView({
	data,
	labels,
	selectedIds,
}: Props) {
	const [rows, setRows] = useState<InstanceRow[]>([]);

	const selectedAnnotations = useMemo(() => {
		if (!data) return [];
		return data.annotations.filter((ann) => selectedIds.includes(ann.id));
	}, [data, selectedIds]);

	const computeBleaching = useCallback(
		async (imageUrl: string, annotations: Annotation[], w: number, h: number) => {
			const img = new Image();
			await new Promise<void>((res, rej) => {
				img.onload = () => res();
				img.onerror = () => rej();
				img.src = imageUrl;
			});
			const offscreen = document.createElement("canvas");
			offscreen.width = w;
			offscreen.height = h;
			const ctx = offscreen.getContext("2d")!;
			ctx.drawImage(img, 0, 0, w, h);
			const pixelData = ctx.getImageData(0, 0, w, h);
			return annotations.map((ann) => {
				const mask = decodeRLE(ann.segmentation);
				return calculateBleaching(pixelData, mask);
			});
		},
		[],
	);

	useEffect(() => {
		if (!data || selectedAnnotations.length === 0) {
			setRows([]);
			return;
		}

		const labelMap = new Map(labels.map((l) => [l.id, l]));
		const baseRows: InstanceRow[] = selectedAnnotations.map((ann) => ({
			id: ann.id,
			labelName: labelMap.get(ann.labelId)?.name ?? "(unlabeled)",
			statuses: labelMap.get(ann.labelId)?.status ?? [],
			bleachingPct: null,
		}));
		setRows(baseRows);

		const { imageUrl, width, height } = data.imageData;
		computeBleaching(imageUrl, selectedAnnotations, width, height).then(
			(pcts) => {
				setRows(baseRows.map((row, i) => ({ ...row, bleachingPct: pcts[i] })));
			},
		);
	}, [data, selectedAnnotations, labels, computeBleaching]);

	if (selectedAnnotations.length === 0) {
		return (
			<div className="stat-section stat-section--instance">
				<h3 className="stat-section__title">Instance Statistics</h3>
				<p className="stat-empty-hint">
					Click or drag on the canvas to select annotations.
				</p>
			</div>
		);
	}

	return (
		<div className="stat-section stat-section--instance">
			<h3 className="stat-section__title">
				Instance Statistics
				<span className="stat-section__count">
					&nbsp;({selectedAnnotations.length} selected)
				</span>
			</h3>
			<div className="stat-instance-body">
				{data && (
					<div className="stat-crop-wrap">
						<CroppedMaskCanvas
							imageUrl={data.imageData.imageUrl}
							annotations={selectedAnnotations}
							imageWidth={data.imageData.width}
							imageHeight={data.imageData.height}
						/>
					</div>
				)}
				<div className="stat-table-wrap">
					<table className="stat-table">
						<thead>
							<tr>
								<th>Category</th>
								<th>Status Tags</th>
								<th>Bleaching</th>
								<th>Condition</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const status = bleachingStatus(row.bleachingPct ?? 0);
								const conditionClass = status.toLowerCase().replace(" ", "-");
								return (
									<tr key={row.id}>
										<td>{row.labelName}</td>
										<td>
											{row.statuses.length > 0 ? (
												<div className="stat-tag-list">
													{row.statuses.map((s) => (
														<span key={s} className="stat-tag">
															{s}
														</span>
													))}
												</div>
											) : (
												<span className="stat-no-status">—</span>
											)}
										</td>
										<td>
											{row.bleachingPct === null ? (
												<span className="stat-loading">…</span>
											) : (
												`${row.bleachingPct.toFixed(1)}%`
											)}
										</td>
										<td>
											{row.bleachingPct !== null && (
												<span
													className={`stat-condition stat-condition--${conditionClass}`}
												>
													{status}
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
