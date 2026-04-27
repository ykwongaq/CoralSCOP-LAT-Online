import { useEffect, useState, useMemo, useCallback } from "react";
import type { Label, Data, Annotation } from "../../types/Annotation";
import type { RLE } from "../../types/RLE";
import { computeBleachingPercentages } from "../../services/StatisticService";
import StatisticTable from "../common/Statistic/StatisticTable";
import type { InstanceRowData } from "../common/Statistic/StatisticTableRow";
import styles from "../common/Statistic/Statistic.module.css";

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
	const [rows, setRows] = useState<InstanceRowData[]>([]);

	const selectedAnnotations = useMemo(() => {
		if (!data) return [];
		return data.annotations.filter((ann) => selectedIds.includes(ann.id));
	}, [data, selectedIds]);

	const computeBleaching = useCallback(
		async (imageUrl: string, annotations: Annotation[], w: number, h: number) => {
			return computeBleachingPercentages(imageUrl, annotations, w, h);
		},
		[],
	);

	// Calculate area percentage from RLE segmentation
	const calculateAreaPercentage = useCallback(
		(annotation: Annotation, imageWidth: number, imageHeight: number): number => {
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
		if (!data || selectedAnnotations.length === 0) {
			setRows([]);
			return;
		}

		const labelMap = new Map(labels.map((l) => [l.id, l]));
		const baseRows: InstanceRowData[] = selectedAnnotations.map((ann) => ({
			id: ann.id,
			labelName: labelMap.get(ann.labelId)?.name ?? "(unlabeled)",
			statuses: labelMap.get(ann.labelId)?.status ?? [],
			bleachingPct: null,
			areaPct: calculateAreaPercentage(ann, data.imageData.width, data.imageData.height),
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
			<h3 className={styles.statSectionTitle}>
				Instance Statistics
				<span className={styles.statSectionCount}>
					&nbsp;({selectedAnnotations.length} selected)
				</span>
			</h3>
			{data && (
				<StatisticTable
					rows={rows}
					annotations={selectedAnnotations}
					imageUrl={data.imageData.imageUrl}
					imageWidth={data.imageData.width}
					imageHeight={data.imageData.height}
					showCroppedCanvas={true}
					maxHeight={280}
				/>
			)}
		</div>
	);
}
