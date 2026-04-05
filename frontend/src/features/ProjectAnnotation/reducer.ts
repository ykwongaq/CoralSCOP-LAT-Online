import type { Label, RLE } from "../../types/Annotation";
import type AnnotationSessionState from "../../types/Annotation/AnnotationSession";
import { type ProjectState } from "../../types/Annotation/Project";

export type ProjectAnnotationAction =
	| { type: "LOAD_PROJECT"; payload: ProjectState }
	| {
			type: "ADD_LABEL";
			payload: {
				labelName: string;
			};
	  }
	| {
			type: "DELETE_LABEL";
			payload: { labelId: number };
	  }
	| {
			type: "UPDATE_LABEL_NAME";
			payload: { labelId: number; newName: string };
	  }
	| { type: "ADD_LABEL_STATUS"; payload: { labelId: number; status: string } }
	| {
			type: "DELETE_LABEL_STATUS";
			payload: { labelId: number; statusIndex: number };
	  }
	| {
			type: "ASSIGN_LABEL_TO_ANNOTATION";
			payload: { dataId: number; annotationId: number; labelId: number };
	  }
	| {
			type: "DELETE_ANNOTATIONS";
			payload: { dataId: number; annotationIds: number[] };
	  }
	| {
			type: "ADD_ANNOTATION";
			payload: { dataId: number; segmentation: RLE; labelId: number };
	  }
	;

function addAnnotation(
	state: ProjectState,
	dataId: number,
	segmentation: RLE,
	labelId: number,
): ProjectState {
	const newAnnotationId =
		Math.max(
			0,
			...(state.dataList
				.find((data) => data.id === dataId)
				?.annotations.map((ann) => ann.id) ?? []),
		) + 1;

	const newAnnotation = {
		id: newAnnotationId,
		segmentation,
		labelId,
	};

	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? { ...data, annotations: [...data.annotations, newAnnotation] }
				: data,
		),
	};
}
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

function addLabelStatus(
	state: ProjectState,
	labelId: number,
	status: string,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId
				? { ...label, status: [...label.status, status] }
				: label,
		),
	};
}

function deleteLabelStatus(
	state: ProjectState,
	labelId: number,
	statusIndex: number,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId
				? {
						...label,
						status: label.status.filter((_, i) => i !== statusIndex),
					}
				: label,
		),
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

function assignLabelToAnnotation(
	state: ProjectState,
	dataId: number,
	annotationId: number,
	labelId: number,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? {
						...data,
						annotations: data.annotations.map((annotation) =>
							annotation.id === annotationId
								? { ...annotation, labelId }
								: annotation,
						),
					}
				: data,
		),
	};
}

function deleteAnnotations(
	state: ProjectState,
	dataId: number,
	annotationIds: number[],
): ProjectState {
	const idsToDelete = new Set(annotationIds);
	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? {
						...data,
						annotations: data.annotations
							.filter((annotation) => !idsToDelete.has(annotation.id))
							.map((annotation, index) => ({ ...annotation, id: index })),
					}
				: data,
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
		case "ADD_LABEL_STATUS":
			return addLabelStatus(
				state,
				action.payload.labelId,
				action.payload.status,
			);
		case "DELETE_LABEL_STATUS":
			return deleteLabelStatus(
				state,
				action.payload.labelId,
				action.payload.statusIndex,
			);
		case "ASSIGN_LABEL_TO_ANNOTATION":
			return assignLabelToAnnotation(
				state,
				action.payload.dataId,
				action.payload.annotationId,
				action.payload.labelId,
			);
		case "DELETE_ANNOTATIONS":
			return deleteAnnotations(
				state,
				action.payload.dataId,
				action.payload.annotationIds,
			);
		case "ADD_ANNOTATION":
			return addAnnotation(
				state,
				action.payload.dataId,
				action.payload.segmentation,
				action.payload.labelId,
			);
		default:
			return state;
	}
}
