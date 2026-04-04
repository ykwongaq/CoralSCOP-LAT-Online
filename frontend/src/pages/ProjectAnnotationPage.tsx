import { useNavigate } from "react-router-dom";
import type { ProjectState, Data, Label } from "../types/Annotation/";
import { projectAnnotationReducer } from "../features/ProjectAnnotation/reducer";
import { useCallback, useReducer, useState } from "react";
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
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import SideBarDropDownList from "../components/common/SideBarButtons/SideBarDropDownList";
import SideBarDropDownButton from "../components/common/SideBarButtons/SideBarDropDownButton";
import {
	UploadProjectPanel,
	StatisticPanel,
	StatisticPanelID,
	ImageGalleryPanel,
	ImageGalleryPanelID,
	AnnotationPanel,
	AnnotationPanelID,
} from "../components/panels/ProjectAnnotation";

function isProjectLoaded(state: ProjectState): boolean {
	return state.dataList.length > 0;
}

function ProjectAnnotationPage() {
	const navigate = useNavigate();
	const initialState: ProjectState = {
		dataList: [] as Data[],
		labels: [] as Label[],
		projectName: "" as string,
	};

	const [state, dispatch] = useReducer(projectAnnotationReducer, initialState);
	const [activePanel, setActivePanel] = useState<string>(AnnotationPanelID);
	const [sessionState, sessionDispatch] = useReducer(
		annotationSessionReducer,
		initialAnnotationSessionState,
	);
	const [visualizationSetting, setVisualizationSetting] = useState(
		initialVisualizationSetting,
	);

	const projectLoaded = isProjectLoaded(state);

	const handleBackToHome = useCallback(() => {
		navigate("/");
	}, [navigate]);

	const handlePanelChange = useCallback((panelId: string) => {
		setActivePanel(panelId);
	}, []);

	return (
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
					<div className="wrapper">
						<HeaderWithNavigation
							projectState={state}
							prevImage={() => {}}
							nextImage={() => {}}
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
									id="gallery-button"
									icon="ico-grid"
									label="All Images"
									onClick={() => handlePanelChange(ImageGalleryPanelID)}
									isActive={
										projectLoaded && activePanel === ImageGalleryPanelID
									}
									disabled={!projectLoaded}
								/>
								<SideBarButton
									id="annotation-button"
									icon="ico-stack"
									label="Annotations"
									onClick={() => handlePanelChange(AnnotationPanelID)}
									isActive={projectLoaded && activePanel === AnnotationPanelID}
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
									id="save-button"
									icon="ico-save"
									label="Save"
									onClick={() => {}}
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
										onClick={() => {}}
									/>
									<SideBarDropDownButton
										id="export-annotated-images-button"
										label="Export Annotated Images"
										onClick={() => {}}
									/>
									<SideBarDropDownButton
										id="export-excel-button"
										label="Export Excel"
										onClick={() => {}}
									/>
									<SideBarDropDownButton
										id="export-coco-button"
										label="Export COCO"
										onClick={() => {}}
									/>
									<SideBarDropDownButton
										id="export-chart-button"
										label="Export Chart"
										onClick={() => {}}
									/>
									<SideBarDropDownButton
										id="export-all-button"
										label="Export All"
										onClick={() => {}}
									/>
								</SideBarDropDownList>
							</SideBar>

							{!projectLoaded && (
								<div
									className="main-section page active-page"
									id="uploadProjectPage"
								>
									<UploadProjectPanel />
								</div>
							)}
							{projectLoaded && activePanel === ImageGalleryPanelID && (
								<div className="main-section page active-page" id="galleryPage">
									<ImageGalleryPanel />
								</div>
							)}
							{projectLoaded && activePanel === AnnotationPanelID && (
								<div
									className="main-section page active-page"
									id="annotationPage"
								>
									<AnnotationPanel />
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
				</ProjectContext.Provider>
			</VisualizationSettingContext.Provider>
		</AnnotationSessionContext.Provider>
	);
}

export default ProjectAnnotationPage;
