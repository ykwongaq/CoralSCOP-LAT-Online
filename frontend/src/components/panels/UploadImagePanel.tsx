export const UploadImagePanelID = "upload-image-panel";
import { useCallback, useRef } from "react";
import { useProjectCreation } from "../../features/ProjectCreation/context";
import { usePopMessage } from "../common/PopUpMessages/PopMessageContext";
import ImageUploader from "../common/ImageUploader";
import type { ImageSelectionData } from "../../types/projectCreation";
import ImageGallery from "../common/ImageGallery/ImageGallery";
import BottomBar from "../layout/BottomBar";
import Button from "../common/Button";
import type { ApiRequestHandle } from "../../types/api";
import { createProject } from "../../services/CreateProjectService";
import { deleteProject } from "../../services/DeleteProjectService";
import { downloadProject } from "../../services/DownloadProjectService";
import { useNavigate } from "react-router-dom";

export default function UploadImagePanel() {
  const navigate = useNavigate();
  const { state, dispatch } = useProjectCreation();
  const {
    showMessage,
    closeMessage,
    showError,
    showLoading,
    updateLoadingProgress,
  } = usePopMessage();

  const backToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Holds the active request handle so we can cancel it from the modal button.
  const requestHandleRef = useRef<ApiRequestHandle | null>(null);

  const handleImages = useCallback(
    (images: ImageSelectionData[]) => {
      dispatch({ type: "ADD_IMAGES", payload: images });
    },
    [dispatch],
  );

  const handleToggleSelection = useCallback(
    (index: number) => {
      dispatch({ type: "TOGGLE_IMAGE_SELECTION", payload: index });
    },
    [dispatch],
  );

  const handleSelectAll = useCallback(() => {
    dispatch({ type: "SELECT_ALL_IMAGES", payload: null });
  }, [dispatch]);

  const handleDeselectAll = useCallback(() => {
    dispatch({ type: "DESELECT_ALL_IMAGES", payload: null });
  }, [dispatch]);

  const handleCreateProject = useCallback(() => {
    requestHandleRef.current = createProject(
      {
        images: state.imageDataList,
        config: state.config,
        model: state.model_selection,
      },
      {
        onLoading: () => {
          showLoading({
            title: "Creating Project",
            content: "Uploading images and processing…",
            progress: null,
            buttons: [
              {
                label: "Cancel",
                onClick: () => {
                  requestHandleRef.current?.cancel();
                  requestHandleRef.current = null;
                  closeMessage();
                },
              },
            ],
          });
        },
        onProgress: (pct) => {
          updateLoadingProgress(pct);
        },
        onError: (err) => {
          showError({
            title: "Failed to Create Project",
            content: "An error occurred while communicating with the server.",
            errorMessage: err.message,
            buttons: [{ label: "Close", onClick: closeMessage }],
          });
        },
        onComplete: (data) => {
          closeMessage();
          showMessage({
            title: "Project Created",
            content:
              "Your project has been created successfully. Please click Download to get your project file.",
            buttons: [
              {
                label: "Cancel",
                onClick: () => {
                  deleteProject(
                    { token: data.downloadToken },
                    {
                      onComplete: closeMessage,
                      onError(error) {
                        showError({
                          title: "Failed to Delete Project",
                          content:
                            "An error occurred while communicating with the server.",
                          errorMessage: error.message,
                          buttons: [{ label: "Close", onClick: closeMessage }],
                        });
                      },
                    },
                  );
                },
              },
              {
                label: "Download",
                onClick: () =>
                  downloadProject(
                    { token: data.downloadToken },
                    {
                      onComplete: () => {
                        closeMessage();
                        backToHome();
                      },
                      onError: (error) => {
                        showError({
                          title: "Failed to Download Project",
                          content:
                            "An error occurred while communicating with the server.",
                          errorMessage: error.message,
                          buttons: [{ label: "Close", onClick: closeMessage }],
                        });
                      },
                    },
                  ),
              },
            ],
          });
        },
      },
    );
  }, [
    state.imageDataList,
    state.config,
    state.model_selection,
    showLoading,
    showError,
    showMessage,
    closeMessage,
    updateLoadingProgress,
  ]);

  return (
    <div className="main-section__inner">
      <p className="main-section__title">Upload Images</p>
      <div className="main-section__content">
        <ImageUploader onImages={handleImages} />
        <ImageGallery
          imageDataList={state.imageDataList}
          onToggleSelection={handleToggleSelection}
        />
      </div>

      {state.imageDataList.length > 0 && (
        <BottomBar>
          <Button
            onClick={handleDeselectAll}
            additionalClassName="button--border"
          >
            Deselect All
          </Button>
          <Button
            onClick={handleSelectAll}
            additionalClassName="button--border"
          >
            Select All
          </Button>
          <Button
            onClick={handleCreateProject}
            disabled={state.imageDataList.every((image) => !image.selected)}
          >
            Create Project
          </Button>
        </BottomBar>
      )}
    </div>
  );
}
