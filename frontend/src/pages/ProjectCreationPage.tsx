import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import SideBar from "../components/layout/SideBar";
import { SideBarButton } from "../components/common/SideBarButtons";
import { UploadImagePanel, ProjectSettingPanel } from "../components/panels";
import type { PanelId } from "../types";

const PANEL_CONFIG: { id: PanelId; icon: string; label: string }[] = [
  { id: "gallery", icon: "ico-grid", label: "Gallery" },
  { id: "settings", icon: "ico-gear", label: "Setting" },
];

function ProjectCreationPage() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<PanelId>("gallery");

  const handleBackToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handlePanelChange = useCallback((panelId: PanelId) => {
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
          {activePanel === "gallery" && (
            <div className="page active-page" id="galleryPage">
              <UploadImagePanel />
            </div>
          )}
          {activePanel === "settings" && (
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
