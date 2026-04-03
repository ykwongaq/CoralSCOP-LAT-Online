import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
import AnnotationSiderBlock from "../../common/AnnotationSettings/AnnotationSiderBlock";
import LabelBar from "../../common/Labels/LabelBar";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { usePopMessage } from "../../common/PopUpMessages/PopMessageContext";
export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
    const { state, dispatch } = useProject();
    const {
        showMessage,
        closeMessage,
        showError,
        showLoading,
        updateLoadingProgress,
    } = usePopMessage();

    return (
        <>
            <AnnotationSideBar>
                <AnnotationSiderBlock
                    name="Opacity"
                    id="opacity"
                    defaultValue={40}
                    onChange={(value) => {
                        console.log("Opacity changed:", value);
                    }}
                    minValue={0}
                    maxValue={100}
                    step={1}
                ></AnnotationSiderBlock>
                <AnnotationSiderBlock
                    name="Opacity"
                    id="opacity"
                    defaultValue={40}
                    onChange={(value) => {
                        console.log("Opacity changed:", value);
                    }}
                    minValue={0}
                    maxValue={100}
                    step={1}
                ></AnnotationSiderBlock>
                <LabelBar labels={state.labels} />
            </AnnotationSideBar>
            <AnnotationCanvas />
        </>
    );
}
