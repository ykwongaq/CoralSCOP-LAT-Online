import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import { UploadImagePanel, ProjectSettingPanel } from "../components/panels";
import { UploadImagePanelID, ProjectSettingPanelID } from "../components/panels";

const PANEL_CONFIG: { id: string; icon: string; label: string }[] = [
  { id: UploadImagePanelID, icon: "ico-grid", label: "Gallery" },
  { id: ProjectSettingPanelID, icon: "ico-gear", label: "Setting" },
];

function ProjectCreationPage() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<string>(UploadImagePanelID);

  const handleBackToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handlePanelChange = useCallback((panelId: string) => {
    setActivePanel(panelId);
  }, []);

  return (
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
          {PANEL_CONFIG.map((panel) => (
            <SideBarButton
              key={panel.id}
              id={`${panel.id}-button`}
              icon={panel.icon}
              label={panel.label}
              onClick={() => handlePanelChange(panel.id)}
              isActive={activePanel === panel.id}
            />
          ))}
        </SideBar>
        <main className="main-section">
          {activePanel === UploadImagePanelID && (
            <div className="page active-page" id="galleryPage">
              <UploadImagePanel />
            </div>
          )}
          {activePanel === ProjectSettingPanelID && (
            <div className="page active-page" id="settingPage">
              <ProjectSettingPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProjectCreationPage;
