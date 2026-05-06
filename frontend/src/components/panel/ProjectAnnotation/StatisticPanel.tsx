import { useState, useRef, useEffect } from "react";
import { useProject, useAnnotationSession } from "../../../store";
import {
	StatisticCanvas,
	ImageLevelStatisticView,
	InstanceLevelStatisticView,
} from "../../layout";

import styles from "./StatisticPanel.module.css";

export const StatisticPanelID = "statistic-panel";

export function StatisticPanel() {
	const { projectState } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const { currentDataIndex } = annotationSessionState;
	const data = projectState.dataList[currentDataIndex] ?? null;

	// Independent selection state for the statistic panel
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	// Clear selection when the current image changes
	const prevDataIndexRef = useRef(currentDataIndex);
	useEffect(() => {
		if (prevDataIndexRef.current !== currentDataIndex) {
			setSelectedIds([]);
			prevDataIndexRef.current = currentDataIndex;
		}
	}, [currentDataIndex]);

	return (
		<div className={styles.statePanel}>
			<div className={styles.statLeft}>
				<StatisticCanvas
					data={data}
					selectedIds={selectedIds}
					onSelectIds={setSelectedIds}
				/>
			</div>

			<div className={styles.statRight}>
				<div className={styles.statRightTop}>
					<ImageLevelStatisticView data={data} labels={projectState.labels} />
				</div>
				<div className={styles.statRightBottom}>
					<InstanceLevelStatisticView
						data={data}
						labels={projectState.labels}
						selectedIds={selectedIds}
					/>
				</div>
			</div>
		</div>
	);
}

export default StatisticPanel;
