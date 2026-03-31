import { useProjectCreation } from "../../features/ProjectCreation/context";
import {
  SettingSliderBlock,
  SettingGroups,
  SettingSelectBlock,
} from "../common/Settings";

const MODEL_OPTIONS = [
  { label: "None", value: null },
  { label: "CoralSCOP", value: "CoralSCOP" },
  { label: "CoralTank", value: "CoralTank" },
];

export const ProjectSettingPanelID = "project-creation-setting-panel";

export default function ProjectSettingPanel() {
  const { state, dispatch } = useProjectCreation();

  function onMinAreaChange(value: number) {
    dispatch({ type: "UPDATE_MIN_AREA", payload: value / 100 });
  }

  function onMinConfidenceChange(value: number) {
    dispatch({ type: "UPDATE_MIN_CONFIDENCE", payload: value / 100 });
  }

  function onMaxOverlapChange(value: number) {
    dispatch({ type: "UPDATE_MAX_OVERLAP", payload: value / 100 });
  }

  function onModelSelectionChange(value: string | null) {
    dispatch({ type: "UPDATE_MODEL_SELECTION", payload: value });
  }

  return (
    <div className="main-section__inner">
      <p className="main-section__title">Setting</p>
      <p className="main-section__desc">
        Adjust the settings to carefully filter out any unwanted masks generated
        by the model, enhancing the accuracy and performance of your results.
      </p>
      <div className="main-section__content">
        <SettingGroups>
          <SettingSliderBlock
            title="Min Area:"
            description="Filter out the masks that is too small. (in % of pixel area of the image). Range (0-20)"
            id="min-area"
            defaultValue={state.config.min_area * 100}
            minValue={0}
            maxValue={20}
            step={0.1}
            onChange={onMinAreaChange}
          ></SettingSliderBlock>
          <SettingSliderBlock
            title="Min Confidence:"
            description="Filter out the masks that is too low confidence. It can increase the reliability of the annotation. (in %)"
            id="min-confidence"
            defaultValue={state.config.min_confidence * 100}
            minValue={0}
            maxValue={100}
            step={1}
            onChange={onMinConfidenceChange}
          ></SettingSliderBlock>
          <SettingSliderBlock
            title="Max Overlap"
            description="Filter out the maks that overlap too much with other masks. It overlaps is measured using Intersectino over Union (IoU). (in %)"
            id="max-overlap"
            defaultValue={state.config.max_overlap * 100}
            minValue={0}
            maxValue={50}
            step={0.1}
            onChange={onMaxOverlapChange}
          ></SettingSliderBlock>
          <SettingSelectBlock
            title="Model:"
            description="Select the model to use for segmentation. Choose None to skip automatic segmentation."
            id="model-selection"
            options={MODEL_OPTIONS}
            value={state.model_selection}
            onChange={onModelSelectionChange}
          />
        </SettingGroups>
      </div>
    </div>
  );
}
