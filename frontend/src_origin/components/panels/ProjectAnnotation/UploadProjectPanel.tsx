import { useCallback, useRef, useState } from "react";
import BottomBar from "../../layout/BottomBar";
import Button from "../../common/Button";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { usePopMessage } from "../../common/PopUpMessages/PopMessageContext";
import { loadProject } from "../../../services/LoadProjectService";
import styles from "../../common/ImageUploader.module.css";

export const UploadProjectPanelID = "project-upload-panel";

export function UploadProjectPanel() {
  const { dispatch } = useProject();
  const { showLoading, showError, updateLoadingProgress, closeMessage } =
    usePopMessage();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCoralFile = (file: File) => file.name.endsWith(".coral");

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isCoralFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isCoralFile(file)) {
        setSelectedFile(file);
      }
    },
    [],
  );

  const openFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenProject = useCallback(() => {
    if (!selectedFile) return;
    void loadProject(selectedFile, {
      onLoading: () => {
        showLoading({
          title: "Opening Project",
          content: "Unpacking project file…",
          progress: null,
        });
      },
      onProgress: (pct) => {
        updateLoadingProgress(pct);
      },
      onError: (err) => {
        showError({
          title: "Failed to Open Project",
          content: "An error occurred while reading the project file.",
          errorMessage: err.message,
          buttons: [{ label: "Close", onClick: closeMessage }],
        });
      },
      onComplete: (state) => {
        closeMessage();
        dispatch({ type: "LOAD_PROJECT", payload: state });
      },
    });
  }, [
    selectedFile,
    showLoading,
    updateLoadingProgress,
    showError,
    closeMessage,
    dispatch,
  ]);

  return (
    <div className="main-section__inner">
      <p className="main-section__title">Open Project</p>
      <div className="main-section__content">
        <div
          className={`${styles.dropContainer} ${styles.dropContainerLarge}${isDragging ? ` ${styles.dropContainerActive}` : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={styles.dropText}>
            {selectedFile ? (
              <span>{selectedFile.name}</span>
            ) : (
              <>
                Drop .coral project file here. Or{" "}
                <button className="button select-link" onClick={openFileSelect}>
                  browse
                </button>{" "}
                to select a file.
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".coral"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      <BottomBar>
        <Button onClick={handleOpenProject} disabled={!selectedFile}>
          Open Project
        </Button>
      </BottomBar>
    </div>
  );
}
