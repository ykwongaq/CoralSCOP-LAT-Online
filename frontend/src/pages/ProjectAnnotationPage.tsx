import { useNavigate } from "react-router-dom";
import type { ProjectState, Data, Label } from "../types/Annotation/";
import { projectAnnotationReducer } from "../features/ProjectAnnotation/reducer";
import { useCallback, useReducer } from "react";
import { ProjectContext } from "../features/ProjectAnnotation/context";
import HeaderWithNavigation from "../components/layout/HeaderWIthNavigation";
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import SideBarDropDownList from "../components/common/SideBarButtons/SideBarDropDownList";
import SideBarDropDownButton from "../components/common/SideBarButtons/SideBarDropDownButton";

function ProjectAnnotationPage() {
  const navigate = useNavigate();
  const initialState: ProjectState = {
    dataList: [] as Data[],
    labels: [] as Label[],
    projectName: "" as string,
  };

  const [state, dispatch] = useReducer(projectAnnotationReducer, initialState);

  const handleBackToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
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
              onClick={handleBackToHome}
            />
            <SideBarButton
              id="label-button"
              icon="ico-stack"
              label="Annotations"
              onClick={handleBackToHome}
            />
            <SideBarButton
              id="statistic-button"
              icon="ico-wave"
              label="Statistics"
              onClick={handleBackToHome}
            />
            <SideBarButton
              id="save-button"
              icon="ico-save"
              label="Save"
              onClick={handleBackToHome}
            />
            <SideBarDropDownList
              id="file-button"
              label="Export"
              icon="ico-exit"
            >
              <SideBarDropDownButton
                id="export-image-button"
                label="Export All Images"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
              <SideBarDropDownButton
                id="export-annotated-images-button"
                label="Export Annotated Images"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
              <SideBarDropDownButton
                id="export-excel-button"
                label="Export Excel"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
              <SideBarDropDownButton
                id="export-coco-button"
                label="Export COCO"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
              <SideBarDropDownButton
                id="export-chart-button"
                label="Export Chart"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
              <SideBarDropDownButton
                id="export-all-button"
                label="Export All"
                onClick={handleBackToHome}
              ></SideBarDropDownButton>
            </SideBarDropDownList>
          </SideBar>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectAnnotationPage;
