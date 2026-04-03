import type { ProjectCreationState } from "../../types/ProjectCreation";
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
    model_selection: state.model_selection,
  });
}
