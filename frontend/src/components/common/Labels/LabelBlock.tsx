import { getLabelColor, getTextColor } from "../LabelColorMap";

interface LabelBlockProps {
    labelID: number;
    labelName: string;
    subCategories?: string[];
}

export default function LabelBlock({
    labelID,
    labelName,
    subCategories = [],
}: LabelBlockProps) {
    const labelColor = getLabelColor(labelID);
    const textColor = getTextColor(labelID);

    return (
        <>
            <div className="label-blk labelButton color-plate-list__item">
                <div
                    className="label-blk__color color-plate-list__color-plate colorBox"
                    style={{
                        backgroundColor: labelColor,
                        color: textColor,
                        borderColor: labelColor,
                    }}
                >
                    {labelID}
                </div>
                <p
                    className="label-blk__label labelText"
                    contentEditable="false"
                    suppressContentEditableWarning={true}
                >
                    {labelName}
                </p>
                <div className="label-blk__side">
                    <button className="label-blk__btn label-hide-fn" value="1">
                        <span className="ico-eye"></span>
                        <span className="ico-hide"></span>
                    </button>
                    <button className="label-blk__btn label-menu-fn">
                        <span className="ico-dots-horizontal-triple"></span>
                    </button>
                </div>
            </div>
        </>
    );
}
