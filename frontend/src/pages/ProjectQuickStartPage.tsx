import { useNavigate } from "react-router-dom";
import type { ProjectState, Data, Label } from "../types/Annotation/";
import { projectAnnotationReducer } from "../features/ProjectAnnotation/reducer";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ProjectContext } from "../features/ProjectAnnotation/context";
import { AnnotationSessionContext } from "../features/AnnotationSession/context";
import {
	annotationSessionReducer,
	initialAnnotationSessionState,
} from "../features/AnnotationSession/reducer";
import {
	VisualizationSettingContext,
	initialVisualizationSetting,
} from "../features/VisualizationSetting/context";
import HeaderWithNavigation from "../components/layout/HeaderWIthNavigation";
import {
	AnnotationCommandsProvider,
	useAnnotationCommands,
} from "../hooks/useAnnotationCommands";

// Rendered inside the context providers so useAnnotationCommands can reach them.
function ConnectedHeader({
	projectState,
	title,
	onClick,
}: {
	projectState: ProjectState;
	title: string;
	onClick: () => void;
}) {
	const { execute } = useAnnotationCommands();
	return (
		<HeaderWithNavigation
			projectState={projectState}
			title={title}
			prevImage={() => execute["prev-image"]()}
			nextImage={() => execute["next-image"]()}
			onClick={onClick}
		/>
	);
}
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import SideBarDropDownList from "../components/common/SideBarButtons/SideBarDropDownList";
import SideBarDropDownButton from "../components/common/SideBarButtons/SideBarDropDownButton";
import { releaseSession, releaseSessionOnUnload } from "../services/SamService";
import { saveProject } from "../services/SaveProjectService";
import { exportAllImages } from "../services/ExportImagesService";
import { exportAllAnnotatedImages } from "../services/ExportAnnotatedImagesService";
import { exportAllCocoAnnotations } from "../services/ExportCocoService";
import {
	StatisticPanel,
	StatisticPanelID,
	ImageGalleryPanel,
	ImageGalleryPanelID,
	AnnotationPanel,
	AnnotationPanelID,
} from "../components/panels/ProjectAnnotation";
import { QuickStartUploadImagePanel } from "../components/panels/ProjectQuickStart";
import {
	ProjectSettingPanel,
	ProjectSettingPanelID,
} from "../components/panels/ProjectCreation";
import { ProjectCreationContext } from "../features/ProjectCreation/context";
import { projectCreationReducer, initialProjectCreationState } from "../features/ProjectCreation/reducer";
import { usePopMessage } from "../components/common/PopUpMessages/PopMessageContext";
import ActionButton from "../components/common/ActionButtons/ActionButton";
import { runModel } from "../services/RunModelService";
import { SCALE_DEFINE_PANEL_ID, ScaleDefinePanel } from "../components/panels/ProjectAnnotation/ScaleDefinePanel";

function isProjectLoaded(state: ProjectState): boolean {
	return state.dataList.length > 0;
}

function ProjectQuickStartPage() {
	const navigate = useNavigate();
	const initialState: ProjectState = {
		dataList: [] as Data[],
		labels: [] as Label[],
		projectName: "" as string,
	};

	const { showMessage, closeMessage, showLoading, showError } = usePopMessage();
	const [state, dispatch] = useReducer(projectAnnotationReducer, initialState);
	const [creationState, creationDispatch] = useReducer(
		projectCreationReducer,
		initialProjectCreationState,
	);
	const [activePanel, setActivePanel] = useState<string>(AnnotationPanelID);
	const [sessionState, sessionDispatch] = useReducer(
		annotationSessionReducer,
		initialAnnotationSessionState,
	);
	const [visualizationSetting, setVisualizationSetting] = useState(
		initialVisualizationSetting,
	);

	const projectLoaded = isProjectLoaded(state);

	// Keep a ref so beforeunload always sees the latest sessionId without a stale closure.
	const sessionIdRef = useRef<string | undefined>(state.sessionId);
	useEffect(() => {
		sessionIdRef.current = state.sessionId;
	}, [state.sessionId]);

	// Warn the user before closing/refreshing the tab when a project is loaded.
	useEffect(() => {
		if (!projectLoaded) return;
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Required for Chrome/Safari to show the leave-page dialog.
			// @ts-ignore — returnValue is deprecated in typings but still needed cross-browser
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [projectLoaded]);

	// Release the SAM session when the page is actually unloaded (tab close /
	// refresh confirmed).  `pagehide` fires only after the user confirms leaving,
	// unlike `beforeunload` which fires before the dialog is shown.
	useEffect(() => {
		const handlePageHide = () => {
			const sid = sessionIdRef.current;
			if (sid) releaseSessionOnUnload(sid);
		};
		window.addEventListener("pagehide", handlePageHide);
		return () => {
			window.removeEventListener("pagehide", handlePageHide);
			const sid = sessionIdRef.current;
			if (sid) releaseSession(sid);
		};
	}, []);

	const handleBackToHome = useCallback(() => {
		// Ask user to confirm if they want to leave without saving when a project is loaded
		if (projectLoaded) {
			showMessage({
				title: "Leave without saving?",
				content:
					"Your changes will be lost if you leave without saving. Are you sure you want to go back to the home page?",
				buttons: [
					{
						label: "Cancel",
						onClick: () => closeMessage(),
					},
					{
						label: "Leave",
						onClick: () => {
							closeMessage();
							navigate("/");
						},
					},
				],
			});
			return;
		} else {
			navigate("/");
		}
	}, [navigate, projectLoaded, showMessage, closeMessage]);

	const handlePanelChange = useCallback((panelId: string) => {
		sessionDispatch({ type: "CLEAR_PENDING_MASK" });
		sessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
		sessionDispatch({ type: "CLEAR_SELECTION" });
		setActivePanel(panelId);
	}, []);

	const handleRunModel = useCallback(async () => {
		const currentData = state.dataList[sessionState.currentDataIndex];
		if (!currentData) return;

		const { imageData } = currentData;

		let imageBlob: Blob;
		try {
			const fetchResponse = await fetch(imageData.imageUrl);
			imageBlob = await fetchResponse.blob();
		} catch (error) {
			console.error("Failed to fetch image blob:", error);
			return;
		}

		const config = {
			model: creationState.model_selection,
			min_area: creationState.config.min_area,
			min_confidence: creationState.config.min_confidence,
			max_overlap: creationState.config.max_overlap,
		};

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
	}, [state, sessionState.currentDataIndex, creationState, showMessage, showLoading, showError, closeMessage, dispatch]);

	function handleStatisticsExport() {
		throw new Error("Function not implemented.");
	}

	return (
		<ProjectCreationContext.Provider
			value={{ state: creationState, dispatch: creationDispatch }}
		>
			<AnnotationSessionContext.Provider
				value={{
					annotationSessionState: sessionState,
					dispatchAnnotationSession: sessionDispatch,
				}}
			>
				<VisualizationSettingContext.Provider
					value={{
						visualizationSetting: visualizationSetting,
						updateVisualizationSetting: (patch) =>
							setVisualizationSetting((s) => ({ ...s, ...patch })),
					}}
				>
					<ProjectContext.Provider value={{ state, dispatch }}>
						<AnnotationCommandsProvider>
							<div className="wrapper">
							<ConnectedHeader
								projectState={state}
								title={
									activePanel === AnnotationPanelID ||
									activePanel === StatisticPanelID
										? `${sessionState.currentDataIndex + 1}. ${state.dataList[sessionState.currentDataIndex]?.imageData.imageName || ""}`
										: ""
								}
								onClick={() => {
									handlePanelChange(ImageGalleryPanelID);
								}}
							/>
							<div className="main">
								<SideBar>
									<SideBarButton
										id="back-to-main-page-button"
										icon="ico-home"
										label="Home"
										onClick={handleBackToHome}
									/>
									<SideBarButton
										id="annotation-button"
										icon="ico-stack"
										label="Annotations"
										onClick={() => handlePanelChange(AnnotationPanelID)}
										isActive={
											projectLoaded && activePanel === AnnotationPanelID
										}
										disabled={!projectLoaded}
									/>
									<SideBarButton
										id="statistic-button"
										icon="ico-wave"
										label="Statistics"
										onClick={() => handlePanelChange(StatisticPanelID)}
										isActive={projectLoaded && activePanel === StatisticPanelID}
										disabled={!projectLoaded}
									/>
									<SideBarButton
										id="setting-button"
										icon="ico-gear"
										label="Settings"
										onClick={() => handlePanelChange(ProjectSettingPanelID)}
										isActive={activePanel === ProjectSettingPanelID}
									/>
									<SideBarButton 
										id="scale-define-button"
										icon="ico-wrench"
										label="Scale"
										onClick={() => handlePanelChange(SCALE_DEFINE_PANEL_ID)}
										isActive={projectLoaded && activePanel === SCALE_DEFINE_PANEL_ID}
										disabled={!projectLoaded}
									/>
									<SideBarButton
										id="save-button"
										icon="ico-save"
										label="Save"
										onClick={() => saveProject(state)}
										disabled={!projectLoaded}
									/>
									<SideBarDropDownList
										id="file-button"
										label="Export"
										icon="ico-exit"
									>
										<SideBarDropDownButton
											id="export-image-button"
											label="Export All Images"
											onClick={async () => {
												showLoading({
													title: "Exporting Images",
													content:
														"Please wait while we prepare your images...",
													progress: null,
													buttons: [
														{
															label: "Cancel",
															onClick: closeMessage,
														},
													],
												});
												try {
													await exportAllImages(state);
												} catch (error) {
													showError({
														title: "Export Failed",
														content:
															"Failed to export images. Please try again.",
														errorMessage:
															error instanceof Error
																? error.message
																: String(error),
														buttons: [
															{
																label: "Close",
																onClick: closeMessage,
															},
														],
													});
													return;
												}
												closeMessage();
											}}
										/>
										<SideBarDropDownButton
											id="export-annotated-images-button"
											label="Export Annotated Images"
											onClick={async () => {
												showLoading({
													title: "Exporting Annotated Images",
													content:
														"Please wait while we prepare your images...",
													progress: null,
													buttons: [
														{
															label: "Cancel",
															onClick: closeMessage,
														},
													],
												});
												try {
													await exportAllAnnotatedImages(
														state,
														visualizationSetting,
													);
												} catch (error) {
													showError({
														title: "Export Failed",
														content:
															"Failed to export annotated images. Please try again.",
														errorMessage:
															error instanceof Error
																? error.message
																: String(error),
														buttons: [
															{
																label: "Close",
																onClick: closeMessage,
															},
														],
													});
													return;
												}
												closeMessage();
											}}
										/>
										<SideBarDropDownButton
											id="export-coco-button"
											label="Export COCO"
											onClick={async () => {
												showLoading({
													title: "Exporting COCO Annotations",
													content:
														"Please wait while we prepare your annotations...",
													progress: null,
													buttons: [
														{
															label: "Cancel",
															onClick: closeMessage,
														},
													],
												});
												try {
													await exportAllCocoAnnotations(state);
												} catch (error) {
													showError({
														title: "Export Failed",
														content:
															"Failed to export COCO annotations. Please try again.",
														errorMessage:
															error instanceof Error
																? error.message
																: String(error),
														buttons: [
															{
																label: "Close",
																onClick: closeMessage,
															},
														],
													});
													return;
												}
												closeMessage();
											}}
										/>
										
																			<SideBarDropDownButton
																			id="export-csv-button"
																			label="Export CSV"
																			onClick={() => {
																				void handleStatisticsExport();
																			}}
																			/>
									</SideBarDropDownList>
								</SideBar>

								{!projectLoaded && activePanel !== ProjectSettingPanelID && (
									<div
										className="main-section page active-page"
										id="quickStartPage"
									>
										<QuickStartUploadImagePanel />
									</div>
								)}
								{activePanel === ProjectSettingPanelID && (
									<div
										className="main-section page active-page"
										id="settingPage"
									>
										<ProjectSettingPanel />
									</div>
								)}
								{projectLoaded && activePanel === ImageGalleryPanelID && (
									<div
										className="main-section page active-page"
										id="galleryPage"
									>
										<ImageGalleryPanel
											onImageClick={() => handlePanelChange(AnnotationPanelID)}
										/>
									</div>
								)}
								{projectLoaded && activePanel === SCALE_DEFINE_PANEL_ID && (
									<div className="main-section page active-page" id="scaleDefinePage">
										<ScaleDefinePanel />
									</div>
								)}
								{projectLoaded && activePanel === AnnotationPanelID && (
									<div
										className="main-section page active-page"
										id="annotationPage"
									>
										<AnnotationPanel
											selectModeChildren={
												<ActionButton
													name="Run Model"
													icon=""
													onClick={handleRunModel}
												/>
											}
										/>
									</div>
								)}
								{projectLoaded && activePanel === StatisticPanelID && (
									<div
										className="main-section page active-page"
										id="statisticPage"
									>
										<StatisticPanel />
									</div>
								)}
							</div>
						</div>
						</AnnotationCommandsProvider>
					</ProjectContext.Provider>
				</VisualizationSettingContext.Provider>
			</AnnotationSessionContext.Provider>
		</ProjectCreationContext.Provider>
	);
}

export default ProjectQuickStartPage;
