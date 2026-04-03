import { useState, useCallback, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import {
  UploadImagePanel,
  UploadImagePanelID,
  ProjectSettingPanel,
  ProjectSettingPanelID,
} from "../components/panels/ProjectCreation";

import { type ProjectCreationState } from "../types/ProjectCreation";
import { ProjectCreationContext } from "../features/ProjectCreation/context";
import { projectCreationReducer } from "../features/ProjectCreation/reducer";

function ProjectCreationPage() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<string>(UploadImagePanelID);

  const initialState: ProjectCreationState = {
    imageDataList: [],
    config: {
      min_area: 0.001,
      min_confidence: 0.5,
      max_overlap: 0.001,
    },
    model_selection: null,
  };

  const [state, dispatch] = useReducer(projectCreationReducer, initialState);

  const handleBackToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handlePanelChange = useCallback((panelId: string) => {
    setActivePanel(panelId);
  }, []);

  return (
    <ProjectCreationContext.Provider value={{ state, dispatch }}>
      <div className="wrapper">
        <Header />
        <div className="main">
          <SideBar>
            <SideBarButton
              id="back-to-main-page-button"
              icon="ico-home"
              label="Home"
              onClick={handleBackToHome}
            />
            <SideBarButton
              id={`${UploadImagePanelID}-button`}
              icon="ico-grid"
              label="Upload Images"
              onClick={() => handlePanelChange(UploadImagePanelID)}
              isActive={activePanel === UploadImagePanelID}
            />
            <SideBarButton
              id={`${ProjectSettingPanelID}-button`}
              icon="ico-gear"
              label="Project Settings"
              onClick={() => handlePanelChange(ProjectSettingPanelID)}
              isActive={activePanel === ProjectSettingPanelID}
            />
          </SideBar>
          {activePanel === UploadImagePanelID && (
            <div className="main-section page active-page" id="galleryPage">
              <UploadImagePanel />
            </div>
          )}
          {activePanel === ProjectSettingPanelID && (
            <div className="main-section page active-page" id="settingPage">
              <ProjectSettingPanel />
            </div>
          )}
        </div>
      </div>
    </ProjectCreationContext.Provider>
  );
}

export default ProjectCreationPage;
