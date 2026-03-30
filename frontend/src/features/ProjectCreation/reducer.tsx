import type {
  ProjectCreationState,
  ImageSelectionData,
} from "../../types/projectCreation";

export type ProjectCreationAction =
  | { type: "ADD_IMAGE"; payload: ImageSelectionData }
  | { type: "ADD_IMAGES"; payload: ImageSelectionData[] }
  | { type: "TOGGLE_IMAGE_SELECTION"; payload: number }
  | { type: "SET_CONFIG"; payload: Record<string, any> }
  | { type: "SET_NEED_SEGMENTATION"; payload: boolean }
  | { type: "SELECT_ALL_IMAGES"; payload: null }
  | { type: "DESELECT_ALL_IMAGES"; payload: null };

export const initialState: ProjectCreationState = {
  imageDataList: [],
  config: {},
  needSegmentation: false,
};

export function projectCreationReducer(
  state: ProjectCreationState,
  action: ProjectCreationAction,
): ProjectCreationState {
  switch (action.type) {
    case "ADD_IMAGE":
      return {
        ...state,
        imageDataList: [
          ...state.imageDataList,
          { ...action.payload, selected: action.payload.selected ?? true },
        ],
      };
    case "ADD_IMAGES":
      return {
        ...state,
        imageDataList: [
          ...state.imageDataList,
          ...action.payload.map((img) => ({
            ...img,
            selected: img.selected ?? true,
          })),
        ],
      };
    case "TOGGLE_IMAGE_SELECTION": {
      const index = action.payload;
      if (index < 0 || index >= state.imageDataList.length) return state;
      const newList = [...state.imageDataList];
      newList[index] = {
        ...newList[index],
        selected: !newList[index].selected,
      };

      console.log(
        "Number of selected images:",
        newList.filter((img) => img.selected).length,
      );
      return { ...state, imageDataList: newList };
    }
    case "SELECT_ALL_IMAGES": {
      return {
        ...state,
        imageDataList: state.imageDataList.map((img) => ({
          ...img,
          selected: true,
        })),
      };
    }
    case "DESELECT_ALL_IMAGES": {
      return {
        ...state,
        imageDataList: state.imageDataList.map((img) => ({
          ...img,
          selected: false,
        })),
      };
    }
    case "SET_CONFIG":
      return { ...state, config: action.payload };
    case "SET_NEED_SEGMENTATION":
      return { ...state, needSegmentation: action.payload };
    default:
      return state;
  }
}
