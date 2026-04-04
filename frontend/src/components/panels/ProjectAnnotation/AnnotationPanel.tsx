import { useCallback, useMemo, useState } from "react";
import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { useVisualizationSetting } from "../../../features/VisualizationSetting/context";
import type { AnnotationCommand } from "../../../types/Annotation/AnnotationCommand";
import { useAnnotationKeyboard } from "../../../hooks/useAnnotationKeyboard";
import ActionButton from "../../common/ActionButtons/ActionButton";
import ActivateLabelButton from "../../common/ActionButtons/ActivateLabelButton";
import AssignLabelButton from "../../common/ActionButtons/AssignLabelButton";
import ActionBar from "../../layout/ActionBar";
import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";

export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
	const { annotationSessionState, dispatchAnnotationSession } =
		useAnnotationSession();
	const { visualizationSetting, updateVisualizationSetting } =
		useVisualizationSetting();
	const { state: projectState, dispatch: projectDispatch } = useProject();

	const mode = annotationSessionState.annotationMode;
	const [isLabelPanelOpen, setIsLabelPanelOpen] = useState(false);
	const [isActivateLabelOpen, setIsActivateLabelOpen] = useState(false);

	// -----------------------------------------------------------------------
	// Command implementations — all side-effect logic lives here
	// -----------------------------------------------------------------------
	const handleToggleMasks = useCallback(() => {
		updateVisualizationSetting({ showMasks: !visualizationSetting.showMasks });
	}, [visualizationSetting.showMasks, updateVisualizationSetting]);

	const handleUndo = useCallback(() => {
		// TODO: implement undo
	}, []);

	const handleRedo = useCallback(() => {
		// TODO: implement redo
	}, []);

	const handleRemove = useCallback(() => {
		projectDispatch({
			type: "DELETE_ANNOTATIONS",
			payload: {
				dataId: annotationSessionState.currentDataIndex,
				annotationIds: annotationSessionState.selectedAnnotations,
			},
		});
		dispatchAnnotationSession({ type: "CLEAR_SELECTION" });
	}, [
		dispatchAnnotationSession,
		projectDispatch,
		annotationSessionState.currentDataIndex,
		annotationSessionState.selectedAnnotations,
	]);

	const handleClearPrompts = useCallback(() => {
		dispatchAnnotationSession({ type: "CLEAR_POINT_PROMPTS" });
	}, [dispatchAnnotationSession]);

	const handleConfirmMask = useCallback(() => {
		// TODO: accept pending mask and add it as an annotation
	}, []);

	const handleSwitchToAdd = useCallback(() => {
		dispatchAnnotationSession({ type: "SET_ANNOTATION_MODE", payload: "add" });
	}, [dispatchAnnotationSession]);

	const handleSwitchToSelect = useCallback(() => {
		dispatchAnnotationSession({
			type: "SET_ANNOTATION_MODE",
			payload: "select",
		});
	}, [dispatchAnnotationSession]);

	const handleToggleLabels = useCallback(() => {
		if (mode === "select") setIsLabelPanelOpen((prev) => !prev);
		else setIsActivateLabelOpen((prev) => !prev);
	}, [mode]);

	// select-label-0..9: delegate to whichever picker is open
	const handleSelectLabelByIndex = useCallback(
		(index: number) => {
			const label = projectState.labels[index];
			if (!label) return;

			if (isLabelPanelOpen) {
				annotationSessionState.selectedAnnotations.forEach((annotationId) => {
					projectDispatch({
						type: "ASSIGN_LABEL_TO_ANNOTATION",
						payload: {
							dataId: annotationSessionState.currentDataIndex,
							annotationId: annotationId,
							labelId: label.id,
						},
					});
				});
				dispatchAnnotationSession({ type: "CLEAR_SELECTION" });
				setIsLabelPanelOpen(false);
			} else if (isActivateLabelOpen) {
				dispatchAnnotationSession({ type: "SET_ACTIVE_LABEL", payload: label });
				setIsActivateLabelOpen(false);
			}
		},
		[
			projectState.labels,
			isLabelPanelOpen,
			isActivateLabelOpen,
			annotationSessionState,
			projectDispatch,
			dispatchAnnotationSession,
		],
	);

	// -----------------------------------------------------------------------
	// Command map — single source of truth that keyboard + buttons both use
	// -----------------------------------------------------------------------
	const execute = useMemo(
		(): Record<AnnotationCommand, () => void> => ({
			"toggle-masks": handleToggleMasks,
			undo: handleUndo,
			redo: handleRedo,
			remove: handleRemove,
			"clear-prompts": handleClearPrompts,
			"confirm-mask": handleConfirmMask,
			"switch-to-add": handleSwitchToAdd,
			"switch-to-select": handleSwitchToSelect,
			"toggle-labels": handleToggleLabels,
			"select-label-0": () => handleSelectLabelByIndex(0),
			"select-label-1": () => handleSelectLabelByIndex(1),
			"select-label-2": () => handleSelectLabelByIndex(2),
			"select-label-3": () => handleSelectLabelByIndex(3),
			"select-label-4": () => handleSelectLabelByIndex(4),
			"select-label-5": () => handleSelectLabelByIndex(5),
			"select-label-6": () => handleSelectLabelByIndex(6),
			"select-label-7": () => handleSelectLabelByIndex(7),
			"select-label-8": () => handleSelectLabelByIndex(8),
		}),
		[
			handleToggleMasks,
			handleUndo,
			handleRedo,
			handleRemove,
			handleClearPrompts,
			handleConfirmMask,
			handleSwitchToAdd,
			handleSwitchToSelect,
			handleToggleLabels,
			handleSelectLabelByIndex,
		],
	);

	// Keyboard shortcuts — thin bridge from key events to execute()
	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
	return (
		<>
			<AnnotationSideBar />
			<AnnotationCanvas />
			<ActionBar hidden={mode !== "select"}>
				<AssignLabelButton
					isOpen={isLabelPanelOpen}
					onToggle={() => setIsLabelPanelOpen((prev) => !prev)}
				/>
				<ActionButton
					name="Remove (R)"
					icon="ico-bin icon"
					onClick={() => execute["remove"]()}
				/>
				<ActionButton
					name="Add Mask (W)"
					icon="ico-shape icon"
					onClick={() => execute["switch-to-add"]()}
				/>
				<ActionButton
					name=""
					icon="ico-undo icon"
					onClick={() => execute["undo"]()}
				/>
				<ActionButton
					name=""
					icon="ico-redo icon"
					onClick={() => execute["redo"]()}
				/>
			</ActionBar>
			<ActionBar hidden={mode !== "add"}>
				<ActivateLabelButton
					isOpen={isActivateLabelOpen}
					onToggle={() => setIsActivateLabelOpen((prev) => !prev)}
				/>
				<ActionButton
					name=""
					icon="ico-undo icon"
					onClick={() => execute["undo"]()}
				/>
				<ActionButton name="" icon="ico-rotate icon" onClick={() => {}} />
				<ActionButton
					name=""
					icon="ico-tick icon"
					onClick={() => execute["confirm-mask"]()}
				/>
				<ActionButton
					name="Back"
					icon="float-bar_button"
					onClick={() => execute["switch-to-select"]()}
				/>
			</ActionBar>
		</>
	);
}
