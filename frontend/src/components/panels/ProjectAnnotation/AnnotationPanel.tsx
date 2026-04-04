import { useCallback, useMemo } from "react";
import { useAnnotationSession } from "../../../features/AnnotationSession/context";
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

	const mode = annotationSessionState.annotationMode;

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
		// TODO: implement remove selected annotations
	}, []);

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
		dispatchAnnotationSession({ type: "SET_ANNOTATION_MODE", payload: "select" });
	}, [dispatchAnnotationSession]);

	// -----------------------------------------------------------------------
	// Command map — single source of truth that keyboard + buttons both use
	// -----------------------------------------------------------------------
	const execute = useMemo((): Record<AnnotationCommand, () => void> => ({
		"toggle-masks":    handleToggleMasks,
		"undo":            handleUndo,
		"redo":            handleRedo,
		"remove":          handleRemove,
		"clear-prompts":   handleClearPrompts,
		"confirm-mask":    handleConfirmMask,
		"switch-to-add":   handleSwitchToAdd,
		"switch-to-select": handleSwitchToSelect,
	}), [
		handleToggleMasks,
		handleUndo,
		handleRedo,
		handleRemove,
		handleClearPrompts,
		handleConfirmMask,
		handleSwitchToAdd,
		handleSwitchToSelect,
	]);

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
				<AssignLabelButton />
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
				<ActionButton name="" icon="ico-undo icon" onClick={() => execute["undo"]()} />
				<ActionButton name="" icon="ico-redo icon" onClick={() => execute["redo"]()} />
			</ActionBar>
			<ActionBar hidden={mode !== "add"}>
				<ActivateLabelButton />
				<ActionButton name="" icon="ico-undo icon" onClick={() => execute["undo"]()} />
				<ActionButton name="" icon="ico-rotate icon" onClick={() => {}} />
				<ActionButton name="" icon="ico-tick icon" onClick={() => execute["confirm-mask"]()} />
				<ActionButton
					name="Back"
					icon="float-bar_button"
					onClick={() => execute["switch-to-select"]()}
				/>
			</ActionBar>
		</>
	);
}
