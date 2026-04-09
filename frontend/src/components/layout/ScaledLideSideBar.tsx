import { useProject } from "../../features/ProjectAnnotation/context";
import LineBlock from "../common/ScaleDefintion/LineBlock";

export default function ScaledLineSideBar() {
	const { state } = useProject();

	return (
		<div className="side-bar__sub">
			<div className="scale-sidebar__intro">
				<h3 className="side-bar__sub-title">Scale Definition</h3>
				<p className="scale-sidebar__hint">
					Drag on the image to create a reference line. Use the mouse wheel to
					zoom and right-drag to pan.
				</p>
			</div>

			<div className="scale-sidebar__list">
				{state.scaledLineList.length === 0 ? (
					<p className="scale-sidebar__empty">
						No scale lines yet. Draw one on the canvas to get started.
					</p>
				) : (
					state.scaledLineList.map((line) => (
						<LineBlock key={line.id} line={line} />
					))
				)}
			</div>
		</div>
	);
}