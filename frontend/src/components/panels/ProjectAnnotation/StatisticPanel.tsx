import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import StatisticCanvas from "../../layout/StatisticCanvas";
import ImageLevelStatisticView from "../../layout/ImageLevelStatisticView";
import InstanceLevelStatisticView from "../../layout/InstanceLevelStatisticView";
import styles from "../../common/Statistic/Statistic.module.css";

export const StatisticPanelID = "statistic-panel";

export function StatisticPanel() {
	const { state } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const { currentDataIndex, selectedAnnotations } = annotationSessionState;
	const data = state.dataList[currentDataIndex] ?? null;

	return (
		<>
			<div className={styles.statLeft}>
				<StatisticCanvas />
			</div>

			<div className={styles.statRight}>
				<div className={styles.statRightTop}>
					<ImageLevelStatisticView data={data} labels={state.labels} />
				</div>
				<div className={styles.statRightBottom}>
					<InstanceLevelStatisticView
						data={data}
						labels={state.labels}
						selectedIds={selectedAnnotations}
					/>
				</div>
			</div>
		</>
	);
}

export default StatisticPanel;
