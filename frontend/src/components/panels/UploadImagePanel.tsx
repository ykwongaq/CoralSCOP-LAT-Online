export const UploadImagePanelID = "upload-image-panel";
import { useCallback } from "react";
import { useProjectCreation } from "../../features/ProjectCreation/context";
import ImageUploader from "../common/ImageUploader";
import type {
  ImageSelectionData,
  ProjectConfig,
} from "../../types/projectCreation";
import type { ImageData } from "../../types/ImageData";
import ImageGallery from "../common/ImageGallery/ImageGallery";
import BottomBar from "../layout/BottomBar";
import Button from "../common/Button";

export default function UploadImagePanel() {
  const { state, dispatch } = useProjectCreation();

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
    // Get all the selected images, and the config
    const selectedImages: ImageData[] = state.imageDataList
      .filter((img) => img.selected)
      .map(({ imageUrl, imageName }) => ({
        imageUrl,
        imageName,
      }));
    const config: ProjectConfig = state.config;
    const modelSelection: string | null = state.model_selection;
  }, [dispatch]);

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
            onClick={() => console.log("Create project")}
            disabled={state.imageDataList.every((image) => !image.selected)}
          >
            Create Project
          </Button>
        </BottomBar>
      )}
    </div>
  );
}