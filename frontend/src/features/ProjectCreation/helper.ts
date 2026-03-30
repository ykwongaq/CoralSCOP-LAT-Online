import type { ProjectCreationState } from "../../types/projectCreation";
import type { ImageData } from "../../types/ImageData";

export function getSelectedImages(state: ProjectCreationState): ImageData[] {
  return state.imageDataList
    .filter((img) => img.selected)
    .map(({ imageUrl, imageName }) => ({
      imageUrl,
      imageName,
    }));
}

export function hasImages(state: ProjectCreationState): boolean {
  return state.imageDataList.length > 0;
}

export function toJSON(state: ProjectCreationState): string {
  return JSON.stringify({
    inputs: state.imageDataList.map(({ imageUrl, imageName, selected }) => ({
      imageUrl,
      imageName,
      selected,
    })),
    config: state.config,
    need_segmentation: state.needSegmentation,
  });
}
