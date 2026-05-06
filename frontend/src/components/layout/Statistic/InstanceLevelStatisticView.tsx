import { useEffect, useState, useMemo, useCallback } from "react";
import type { Label, Data, Annotation, RLE } from "../../../types";
import { computeBleachingPercentages } from "../../../services";
import CroppedCanvas from "../../ui/Statistic/CroppedCanvas";

import styles from "./InstanceLevelStatisticView.module.css";

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface Props {
	data: Data | null;
	labels: Label[];
	selectedIds: number[];
}

interface InstanceStats {
	labelName: string;
	statuses: string[];
	areaPct: number;
	bleachingPct: number | null;
}

export default function InstanceLevelStatisticView({
	data,
	labels,
	selectedIds,
}: Props) {
	const [stats, setStats] = useState<InstanceStats | null>(null);

	const selectedAnnotation = useMemo(() => {
		if (!data) return null;
		const firstId = selectedIds[0];
		if (firstId === undefined) return null;
		return data.annotations.find((a) => a.id === firstId) ?? null;
	}, [data, selectedIds]);

	const computeBleaching = useCallback(
		async (
			imageUrl: string,
			annotations: Annotation[],
			w: number,
			h: number,
		) => {
			return computeBleachingPercentages(imageUrl, annotations, w, h);
		},
		[],
	);

	// Calculate area percentage from RLE segmentation
	const calculateAreaPercentage = useCallback(
		(
			annotation: Annotation,
			imageWidth: number,
			imageHeight: number,
		): number => {
			const rle = annotation.segmentation as RLE;
			if (!rle || !rle.counts || !rle.size) return 0;

			// COCO RLE format: counts array alternates between background and foreground runs
			// Odd indices (1, 3, 5, ...) represent foreground pixel counts
			let pixelCount = 0;
			for (let i = 1; i < rle.counts.length; i += 2) {
				pixelCount += rle.counts[i];
			}

			const totalPixels = imageWidth * imageHeight;
			return totalPixels > 0 ? (pixelCount / totalPixels) * 100 : 0;
		},
		[],
	);

	useEffect(() => {
		if (!data || !selectedAnnotation) {
			setStats(null);
			return;
		}

		const labelMap = new Map(labels.map((l) => [l.id, l]));
		const label = labelMap.get(selectedAnnotation.labelId);
		const areaPct = calculateAreaPercentage(
			selectedAnnotation,
			data.imageData.width,
			data.imageData.height,
		);

		setStats({
			labelName: label?.name ?? "(unlabeled)",
			statuses: label?.status ?? [],
			areaPct,
			bleachingPct: null,
		});

		const { imageUrl, width, height } = data.imageData;
		computeBleaching(imageUrl, [selectedAnnotation], width, height).then(
			(pcts) => {
				setStats((prev) => (prev ? { ...prev, bleachingPct: pcts[0] } : null));
			},
		);
	}, [
		data,
		selectedAnnotation,
		labels,
		computeBleaching,
		calculateAreaPercentage,
	]);

	if (!selectedAnnotation) {
		return (
			<div className={`${styles.statSection} ${styles.statSectionInstance}`}>
				<h3 className={styles.statSectionTitle}>Instance Statistics</h3>
				<p className={styles.statEmptyHint}>
					Click or drag on the canvas to select annotations.
				</p>
			</div>
		);
	}

	return (
		<div className={`${styles.statSection} ${styles.statSectionInstance}`}>
			<h3 className={styles.statSectionTitle}>Instance Statistics</h3>
			{data && stats && (
				<div className={styles.statSplitRow}>
					<div className={styles.statImagePanel}>
						<CroppedCanvas
							imageUrl={data.imageData.imageUrl}
							annotation={selectedAnnotation}
							imageWidth={data.imageData.width}
							imageHeight={data.imageData.height}
						/>
					</div>
					<div className={styles.statDataPanel}>
						<div className={styles.statDetailItem}>
							<span className={styles.statDetailLabel}>Category</span>
							<span className={styles.statDetailValue}>{stats.labelName}</span>
						</div>
						<div className={styles.statDetailItem}>
							<span className={styles.statDetailLabel}>Status Tags</span>
							<div className={styles.statTagList}>
								{stats.statuses.length > 0 ? (
									stats.statuses.map((s) => (
										<span key={s} className={styles.statTag}>
											{s}
										</span>
									))
								) : (
									<span className={styles.statNoStatus}>—</span>
								)}
							</div>
						</div>
						<div className={styles.statDetailItem}>
							<span className={styles.statDetailLabel}>White Pixel %</span>
							<span className={styles.statDetailValue}>
								{stats.bleachingPct === null ? (
									<span className={styles.statLoading}>…</span>
								) : (
									`${stats.bleachingPct.toFixed(1)}%`
								)}
							</span>
						</div>
						<div className={styles.statDetailItem}>
							<span className={styles.statDetailLabel}>Area %</span>
							<span className={styles.statDetailValue}>
								{stats.areaPct.toFixed(2)}%
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
