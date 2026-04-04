import { useProject } from "../../features/ProjectAnnotation/context";
import { useVisualizationSetting } from "../../features/VisualizationSetting/context";
import AnnotationSiderBlock from "../common/AnnotationSettings/AnnotationSiderBlock";
import { AnnotationToggleBlock } from "../common/AnnotationSettings/AnnotationToggleBlock";
import LabelBar from "../common/Labels/LabelBar";

export default function AnnotationSideBar() {
	const { state, dispatch } = useProject();
	const { visualizationSetting, updateVisualizationSetting } =
		useVisualizationSetting();

	return (
		<div className="side-bar__sub">
			<AnnotationSiderBlock
				name="Opacity"
				id="opacity"
				defaultValue={40}
				onChange={(value) => {
					console.log("Opacity changed:", value);
				}}
				minValue={0}
				maxValue={100}
				step={1}
			></AnnotationSiderBlock>
			<AnnotationToggleBlock
				name="Show Masks (Tab)"
				id="show-masks"
				defaultValue={visualizationSetting.showMasks}
				onChange={(value) => {
					updateVisualizationSetting({ showMasks: value });
				}}
			></AnnotationToggleBlock>
			<LabelBar labels={state.labels} />
		</div>
	);
}
