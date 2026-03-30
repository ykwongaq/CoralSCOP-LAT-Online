export const UploadImagePanelID = "upload-image-panel";
import { useCallback } from "react";
import { useProjectCreation } from "../../features/ProjectCreation/context";
import ImageUploader from "../common/ImageUploader";
import type { ImageSelectionData } from "../../types/projectCreation";
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
    </div>
  );
}
