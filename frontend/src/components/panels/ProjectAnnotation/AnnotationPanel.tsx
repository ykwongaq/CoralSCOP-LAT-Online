import AnnotationCanvas from "../../layout/AnnotationCanvas";
import AnnotationSideBar from "../../layout/AnnotationSideBar";
import AnnotationSiderBlock from "../../common/AnnotationSettings/AnnotationSiderBlock";
export const AnnotationPanelID = "annotation-panel";

export function AnnotationPanel() {
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
      </AnnotationSideBar>
      <AnnotationCanvas />
    </>
  );
}
