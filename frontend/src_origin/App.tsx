import { BrowserRouter, Routes, Route } from "react-router-dom";
import EntryPage from "./pages/EntryPage";
import ProjectCreationPage from "./pages/ProjectCreationPage";
import ProjectAnnotationPage from "./pages/ProjectAnnotationPage";
import ProjectQuickStartPage from "./pages/ProjectQuickStartPage";
import { PopMessageProvider } from "./components/common/PopUpMessages/PopMessageContext";
import "./App.css";
import "./assets/icon/style.css";

function App() {
  return (
    <PopMessageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/project-creation" element={<ProjectCreationPage />} />
          <Route
            path="/project-annotation"
            element={<ProjectAnnotationPage />}
          />
          <Route
            path="/project-quick-start"
            element={<ProjectQuickStartPage />}
          />
        </Routes>
      </BrowserRouter>
    </PopMessageProvider>
  );
}

export default App;
