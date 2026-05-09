import { useEffect, useState, useMemo, useCallback } from "react";
import type { Label, Data, Annotation, RLE } from "../../../types";
import {
	computeBleachingPercentages,
	classifyPixelsByColor,
	type ColorClassificationResult,
} from "../../../services";
import { colorToHex } from "../../../utils/color";
import CroppedCanvas from "../../ui/Statistic/CroppedCanvas";
import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

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
	colorClassification: ColorClassificationResult[] | null;
}

export default function InstanceLevelStatisticView({
	data,
	labels,
	selectedIds,
}: Props) {
	const [stats, setStats] = useState<InstanceStats | null>(null);
	const [hoveredClass, setHoveredClass] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);

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
			colorClassification: null,
		});

		const { imageUrl, width, height } = data.imageData;
		computeBleaching(imageUrl, [selectedAnnotation], width, height).then(
			(pcts) => {
				setStats((prev) => (prev ? { ...prev, bleachingPct: pcts[0] } : null));
			},
		);

		// Compute color classification if coralWatch is available
		if (data.coralWatch && data.coralWatch.classPoints.length > 0) {
			classifyPixelsByColor(
				imageUrl,
				selectedAnnotation,
				data.coralWatch.classPoints,
				width,
				height,
			).then((results) => {
				setStats((prev) =>
					prev ? { ...prev, colorClassification: results } : null,
				);
			});
		}
	}, [
		data,
		selectedAnnotation,
		labels,
		computeBleaching,
		calculateAreaPercentage,
	]);


	const sortedColorData = useMemo(() => {
		if (!stats?.colorClassification) return [];
		return [...stats.colorClassification]
			.sort((a, b) => b.pct - a.pct)
			.map((item) => ({
				...item,
				hex: colorToHex(item.color),
			}));
	}, [stats?.colorClassification]);

	const topColors = useMemo(() => {
		return sortedColorData.slice(0, 5);
	}, [sortedColorData]);

	const remainingCount = sortedColorData.length - topColors.length;
	const hasColorData = sortedColorData.length > 0;

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
						{/* Category Name */}
						<div className={styles.statCategoryBlock}>
							<span className={styles.statCategoryLabel}>Category</span>
							<span className={styles.statCategoryName}>
								{stats.labelName}
							</span>
						</div>

						{/* Status Tags */}
						{stats.statuses.length > 0 && (
							<div className={styles.statTagList}>
								{stats.statuses.map((s) => (
									<span key={s} className={styles.statTag}>
										{s}
									</span>
								))}
							</div>
						)}

						{/* Compact Metrics Row */}
						<div className={styles.statMetricsRow}>
							<div className={styles.statMetricBlock}>
								<span className={styles.statMetricValue}>
									{stats.bleachingPct === null ? (
										<span className={styles.statLoading}>…</span>
									) : (
										`${stats.bleachingPct.toFixed(1)}%`
									)}
								</span>
								<span className={styles.statMetricLabel}>White Pixel</span>
							</div>
							<div className={styles.statMetricDivider} />
							<div className={styles.statMetricBlock}>
								<span className={styles.statMetricValue}>
									{stats.areaPct.toFixed(2)}%
								</span>
								<span className={styles.statMetricLabel}>Area</span>
							</div>
						</div>

						{/* Color Classification */}
						{hasColorData ? (
							<div className={`${styles.statClassificationWrap} ${isExpanded ? styles.expanded : ""}`}>
								<div className={styles.statClassificationHeader}>
									<span className={styles.statSectionSubTitle}>
										Color Classification
									</span>
									<span className={styles.statClassCount}>
										{sortedColorData.length} classes
									</span>
								</div>

								{/* Collapsed: Pie Chart + Top 5 */}
								{!isExpanded && (
									<>
										<div className={styles.statChartWrap}>
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie
														data={sortedColorData}
														dataKey="pct"
														nameKey="label"
														cx="50%"
														cy="50%"
														outerRadius={60}
														innerRadius={30}
														paddingAngle={1}
														label={false}
														onMouseEnter={(_, index) =>
															setHoveredClass(
																sortedColorData[index].label,
															)
														}
														onMouseLeave={() =>
															setHoveredClass(null)
														}
													>
														{sortedColorData.map((entry) => (
															<Cell
																key={entry.label}
																fill={entry.hex}
																stroke="#ffffff"
																strokeWidth={1.5}
																opacity={
																	hoveredClass === null ||
																	hoveredClass === entry.label
																		? 1
																		: 0.4
																}
															/>
														))}
													</Pie>
													<Tooltip
														// eslint-disable-next-line @typescript-eslint/no-explicit-any
														formatter={(value: any, name: any) => [
															typeof value === "number"
																? `${value.toFixed(1)}%`
																: String(value),
															name,
														]}
														contentStyle={{
															fontSize: 12,
															fontFamily: "Roboto",
															borderRadius: 6,
															border: "1px solid var(--line-line-primary1)",
															boxShadow:
																"0 2px 8px rgba(0,0,0,0.08)",
														}}
													/>
												</PieChart>
											</ResponsiveContainer>
										</div>

										{/* Top Classes Grid */}
										<div className={styles.statTopClassesGrid}>
											{topColors.map((item) => (
												<div
													key={item.label}
													className={`${styles.statTopClassItem} ${
														hoveredClass &&
														hoveredClass !== item.label
															? styles.dimmed
															: ""
													}`}
													onMouseEnter={() =>
														setHoveredClass(item.label)
													}
													onMouseLeave={() =>
														setHoveredClass(null)
													}
												>
													<span
														className={styles.statTopClassDot}
														style={{
															backgroundColor: item.hex,
														}}
													/>
													<span className={styles.statTopClassName}>
														{item.label}
													</span>
													<span className={styles.statTopClassPct}>
														{item.pct.toFixed(1)}%
													</span>
												</div>
											))}
										</div>

										{/* Expand Button */}
										{remainingCount > 0 && (
											<button
												className={styles.statToggleBtn}
												onClick={() => setIsExpanded(true)}
											>
												Show all {sortedColorData.length}{" "}
												classes ▼
											</button>
										)}
									</>
								)}

								{/* Expanded: Stacked Bar + Full List */}
								{isExpanded && (
									<>
										{/* Compact Stacked Bar */}
										<div className={styles.statStackedBar}>
											{sortedColorData.map((item) => (
												<div
													key={item.label}
													className={styles.statStackedSegment}
													style={{
														width: `${item.pct}%`,
														backgroundColor: item.hex,
													}}
													onMouseEnter={() =>
														setHoveredClass(item.label)
													}
													onMouseLeave={() =>
														setHoveredClass(null)
													}
													title={`${item.label}: ${item.pct.toFixed(1)}%`}
												/>
											))}
										</div>

										{/* Full Classes Grid */}
										<div className={`${styles.statTopClassesGrid} ${styles.statGridScrollable}`}>
											{sortedColorData.map((item) =>(
												<div
													key={item.label}
													className={`${styles.statTopClassItem} ${
														hoveredClass &&
															hoveredClass !== item.label
																? styles.dimmed
																: ""
													}`}
													onMouseEnter={() =>
														setHoveredClass(item.label)
													}
													onMouseLeave={() =>
														setHoveredClass(null)
													}
												>
													<span
														className={styles.statTopClassDot}
														style={{
															backgroundColor: item.hex,
														}}
													/>
													<span className={styles.statTopClassName}>
														{item.label}
													</span>
													<span className={styles.statTopClassPct}>
														{item.pct.toFixed(1)}%
													</span>
												</div>
											))}
										</div>

										{/* Collapse Button */}
										<button
											className={styles.statToggleBtn}
											onClick={() => setIsExpanded(false)}
										>
											Show less ▲
										</button>
									</>
								)}
							</div>
						) : (
							<div className={styles.statClassificationWrap}>
								<div className={styles.statClassificationHeader}>
									<span className={styles.statSectionSubTitle}>
										Color Classification
									</span>
								</div>
								<div className={styles.statPlaceholder}>
									<svg
										width="28"
										height="28"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										className={styles.statPlaceholderIcon}
									>
										<path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88z" />
										<path d="M12 22a7 7 0 0 0 7-7c0-2.5-1.5-4.5-3-6.5L12 11 8 8.5C6.5 10.5 5 12.5 5 15a7 7 0 0 0 7 7z" />
									</svg>
									<span className={styles.statPlaceholderText}>
										Define Coral Watch colors to see classification.
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
