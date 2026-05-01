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
	const { currentDataIndex, selectedAnnotations } = annotationSessionState;
	const data = projectState.dataList[currentDataIndex] ?? null;

	return (
		<>
			<div className={styles.statLeft}>
				<StatisticCanvas />
			</div>

			<div className={styles.statRight}>
				<div className={styles.statRightTop}>
					<ImageLevelStatisticView data={data} labels={projectState.labels} />
				</div>
				<div className={styles.statRightBottom}>
					<InstanceLevelStatisticView
						data={data}
						labels={projectState.labels}
						selectedIds={selectedAnnotations}
					/>
				</div>
			</div>
		</>
	);
}

export default StatisticPanel;
