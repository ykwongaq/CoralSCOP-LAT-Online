import { ScaledLineCanvas } from "../../common/ScaleDefintion/ScaledLineCanvas";
import ScaledLineSideBar from "../../layout/ScaledLideSideBar";

export const SCALE_DEFINE_PANEL_ID = "scale-define-panel";


export function ScaleDefinePanel() {
    return <> <ScaledLineSideBar /> <ScaledLineCanvas /> </>;
}