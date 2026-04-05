import type { Annotation } from "../../../types/Annotation";
import type { InstanceRowData } from "./StatisticTableRow";
import StatisticTableRow from "./StatisticTableRow";

interface StatisticTableProps {
    rows: InstanceRowData[];
    annotations: Annotation[];
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    maxHeight?: number;
    showCroppedCanvas?: boolean;
}

/**
 * A table displaying instance-level statistics.
 * Each row represents a selected annotation with its cropped image and data.
 */
export default function StatisticTable({
    rows,
    annotations,
    imageUrl,
    imageWidth,
    imageHeight,
    showCroppedCanvas = true,
    maxHeight = 150,
}: StatisticTableProps) {
    // Create a map for quick annotation lookup by ID
    const annotationMap = new Map(annotations.map((ann) => [ann.id, ann]));

    return (
        <div
            className="stat-table-wrap"
            style={{ maxHeight, overflow: "auto" }}
        >
            <table className="stat-table">
                <thead>
                    <tr>
                        {showCroppedCanvas && <th style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>Preview</th>}
                        <th style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>Category</th>
                        <th style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>Status Tags</th>
                        <th style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>Bleaching</th>
                        <th style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>Area %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const annotation = annotationMap.get(row.id);
                        if (!annotation) return null;

                        return (
                            <StatisticTableRow
                                key={row.id}
                                row={row}
                                annotation={annotation}
                                imageUrl={imageUrl}
                                imageWidth={imageWidth}
                                imageHeight={imageHeight}
                                showCroppedCanvas={showCroppedCanvas}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
