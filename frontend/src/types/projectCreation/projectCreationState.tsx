import { type ImageSelectionData } from "./ImageSelectionData";
export interface ProjectCreationState {
  imageDataList: ImageSelectionData[];
  config: Record<string, any>;
  needSegmentation: boolean;
}
