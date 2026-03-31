import { type ImageSelectionData } from "./ImageSelectionData";
import { type ProjectConfig } from "./ProjectConfig";
export interface ProjectCreationState {
  imageDataList: ImageSelectionData[];
  config: ProjectConfig;
  model_selection: string | null;
}
