import { useAnnotationSession } from "../../features/AnnotationSession/context";
import { useProject } from "../../features/ProjectAnnotation/context";
import LineBlock from "../common/ScaleDefintion/LineBlock";
import styles from "../common/ScaleDefintion/ScaleDefine.module.css";

export default function ScaledLineSideBar() {
	const { state } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const currentData =
		state.dataList[annotationSessionState.currentDataIndex] ?? null;
	const scaledLines = currentData?.scaledLineList ?? [];

	return (
		<div className="side-bar__sub">
			<div className={styles.scaleSidebarIntro}>
				<h3 className="side-bar__sub-title">Scale Definition</h3>
				<p className={styles.scaleSidebarHint}>
					Drag on the image to create a reference line. Use the mouse wheel to
					zoom and right-drag to pan.
				</p>
			</div>

			<div className={styles.scaleSidebarList}>
				{scaledLines.length === 0 ? (
					<p className={styles.scaleSidebarEmpty}>
						No scale lines yet for this image. Draw one on the canvas to get started.
					</p>
				) : (
					scaledLines.map((line) => <LineBlock key={line.id} line={line} />)
				)}
			</div>
		</div>
	);
}