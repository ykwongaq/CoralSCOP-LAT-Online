import { useState } from "react";
import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import AddLabelBlock from "./AddLabelBlock";
import LabelBlock from "./LabelBlock";
import { LabelSearcher } from "./LabelSearcher";

interface LabelBarProps {
	labels: Label[];
}

export default function LabelBar({ labels }: LabelBarProps) {
	const { state, dispatch } = useProject();
	const [searchQuery, setSearchQuery] = useState("");

	const filteredLabels = searchQuery.trim()
		? labels.filter((label) =>
				label.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
			)
		: labels;

	return (
		<>
			<div className="side-bar__blk">
				<LabelSearcher value={searchQuery} onChange={setSearchQuery} />
			</div>
			<div className="side-bar__bottom">
				<div id="label-container" className="label-container color-plate-list">
					{filteredLabels.map((label) => (
						<LabelBlock key={label.id} label={label} />
					))}
				</div>
			</div>
			<AddLabelBlock
				onAddLabel={(labelName) =>
					dispatch({ type: "ADD_LABEL", payload: { labelName } })
				}
			/>
		</>
	);
}
