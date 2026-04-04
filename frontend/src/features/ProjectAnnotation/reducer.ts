import type { Label } from "../../types/Annotation";
import { type ProjectState } from "../../types/Annotation/Project";

export type ProjectAnnotationAction =
	| { type: "LOAD_PROJECT"; payload: ProjectState }
	| {
			type: "ADD_LABEL";
			payload: {
				labelName: string;
			};
	  }
	| { type: "DELETE_LABEL"; payload: { labelId: number } }
	| {
			type: "UPDATE_LABEL_NAME";
			payload: { labelId: number; newName: string };
	  };

function addLabel(state: ProjectState, labelName: string): ProjectState {
	const newLabelId = state.labels.length;
	const newLabel: Label = {
		id: newLabelId,
		name: labelName,
		status: [],
	};

	return {
		...state,
		labels: [...state.labels, newLabel],
	};
}

function deleteLabel(state: ProjectState, labelId: number): ProjectState {
	// Remove the label and reassign contiguous IDs to the remaining labels
	const remainingLabels = state.labels
		.filter((label) => label.id !== labelId)
		.map((label, index) => ({ ...label, id: index }));

	// Build a mapping from old ID -> new ID for surviving labels
	const oldToNewId = new Map<number, number>();
	state.labels
		.filter((label) => label.id !== labelId)
		.forEach((label, index) => {
			oldToNewId.set(label.id, index);
		});

	// Remove annotations that used the deleted label; remap the rest
	const updatedDataList = state.dataList.map((data) => ({
		...data,
		annotations: data.annotations
			.filter((annotation) => annotation.labelId !== labelId)
			.map((annotation) => ({
				...annotation,
				labelId: oldToNewId.get(annotation.labelId) ?? annotation.labelId,
			})),
	}));

	return {
		...state,
		labels: remainingLabels,
		dataList: updatedDataList,
	};
}

function updateLabelName(
	state: ProjectState,
	labelId: number,
	newName: string,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId ? { ...label, name: newName } : label,
		),
	};
}

export function projectAnnotationReducer(
	state: ProjectState,
	action: ProjectAnnotationAction,
): ProjectState {
	switch (action.type) {
		case "LOAD_PROJECT":
			return action.payload;
		case "ADD_LABEL":
			return addLabel(state, action.payload.labelName);
		case "DELETE_LABEL":
			return deleteLabel(state, action.payload.labelId);
		case "UPDATE_LABEL_NAME":
			return updateLabelName(
				state,
				action.payload.labelId,
				action.payload.newName,
			);
		default:
			return state;
	}
}
