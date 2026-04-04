import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
	return (
		<>
			<AnnotationSideBar />
			<AnnotationCanvas />
		</>
	);
}
