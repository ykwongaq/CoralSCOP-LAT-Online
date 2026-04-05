import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import StatisticCanvas from "../../layout/StatisticCanvas";
import ImageLevelStatisticView from "../../layout/ImageLevelStatisticView";
import InstanceLevelStatisticView from "../../layout/InstanceLevelStatisticView";

export const StatisticPanelID = "statistic-panel";

export function StatisticPanel() {
	const { state } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const { currentDataIndex, selectedAnnotations } = annotationSessionState;
	const data = state.dataList[currentDataIndex] ?? null;

	return (
		<>
			{/* Left — select-only canvas */}
			<div className="stat-left">
				<StatisticCanvas />
			</div>

			{/* Right — statistics pane (split top/bottom) */}
			<div className="stat-right">
				<div className="stat-right__top">
					<ImageLevelStatisticView data={data} labels={state.labels} />
				</div>
				<div className="stat-right__bottom">
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
