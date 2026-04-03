import { useProject } from "../../../features/ProjectAnnotation/context";
import type { Label } from "../../../types/Annotation";
import AddLabelBlock from "./AddLabelBlock";
import LabelBlock from "./LabelBlock";

interface LabelBarProps {
    labels: Label[];
}

export default function LabelBar({ labels }: LabelBarProps) {
    const { state, dispatch } = useProject();

    return (
        <>
            <div className="side-bar__bottom">
                <div
                    id="label-container"
                    className="label-container color-plate-list"
                >
                    {labels.map((label) => (
                        <LabelBlock
                            key={label.id}
                            labelID={label.id}
                            labelName={label.name}
                            subCategories={label.status}
                        />
                    ))}
                </div>
            </div>
            <AddLabelBlock
                onAddLabel={(labelName) =>
                    dispatch({ type: "ADD_LABEL", payload: { labelName } })
                }
            />
        </>
    );
}
