import { useContext } from "react";
import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useAnnotationCommands } from "../../../hooks/useAnnotationCommands";
import { useAnnotationKeyboard } from "../../../hooks/useAnnotationKeyboard";
import ActionButton from "../../common/ActionButtons/ActionButton";
import ActivateLabelButton from "../../common/ActionButtons/ActivateLabelButton";
import AssignLabelButton from "../../common/ActionButtons/AssignLabelButton";
import ActionBar from "../../layout/ActionBar";
import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
import { ProjectCreationContext } from "../../../features/ProjectCreation/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { runModel } from "../../../services/RunModelService";
import { usePopMessage } from "../../common/PopUpMessages/PopMessageContext";

export const AnnotationPanelID = "annotation-panel";

interface AnnotationPanelProps {
	isQuickStart?: boolean;
}

export function AnnotationPanel({ isQuickStart }: AnnotationPanelProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { state, dispatch } = useProject();
	const { showLoading, showError, closeMessage, showMessage } = usePopMessage();
	// ProjectCreationContext is only available in ProjectQuickStartPage; use
	// useContext directly so it returns null instead of throwing when absent.
	const creationContext = useContext(ProjectCreationContext);

	const {
		execute,
		isLabelPanelOpen,
		setIsLabelPanelOpen,
		isActivateLabelOpen,
		setIsActivateLabelOpen,
	} = useAnnotationCommands();

	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	const handleRunModel = async () => {
		const currentData = state.dataList[annotationSessionState.currentDataIndex];
		if (!currentData) {
			console.error("No image selected");
			return;
		}

		const { imageData } = currentData;

		let imageBlob: Blob;
		try {
			const fetchResponse = await fetch(imageData.imageUrl);
			imageBlob = await fetchResponse.blob();
		} catch (error) {
			console.error("Failed to fetch image blob:", error);
			return;
		}

		const config = creationContext?.state
			? {
					model: creationContext.state.model_selection,
					min_area: creationContext.state.config.min_area,
					min_confidence: creationContext.state.config.min_confidence,
					max_overlap: creationContext.state.config.max_overlap,
				}
			: {};

		// If the model is not set, pop up message to ask user to select model first
		if (!config.model) {
			showMessage({
				title: "Model Not Selected",
				content:
					"Please select a model in the project settings before running inference.",
				buttons: [{ label: "Dismiss", onClick: closeMessage }],
			});
			return;
		}

		runModel(
			{ image: imageBlob, imageName: imageData.imageName, config },
			{
				onLoading: () =>
					showLoading({
						title: "Running Model",
						content: "Running model inference on the current image...",
						progress: null,
					}),
				onError: (error) => {
					showError({
						title: "Model Error",
						content: "Failed to run model inference.",
						errorMessage: error.message,
						buttons: [{ label: "Dismiss", onClick: closeMessage }],
					});
				},
				onComplete: (data) => {
					closeMessage();
					dispatch({
						type: "ADD_MODEL_OUTPUT",
						payload: {
							dataId: currentData.id,
							annotations: data.annotations,
							categories: data.categories,
						},
					});
				},
			},
		);
	};

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
				{isQuickStart && (
					<ActionButton name="Run Model" icon="" onClick={handleRunModel} />
				)}
			</ActionBar>
			<ActionBar hidden={mode !== "add"}>
				<ActivateLabelButton
					isOpen={isActivateLabelOpen}
					onToggle={() => setIsActivateLabelOpen((prev) => !prev)}
				/>
				<ActionButton
					name=""
					icon="ico-rotate icon"
					onClick={() => execute["clear-prompts"]()}
				/>
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
