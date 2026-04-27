import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import { useProject } from "../../../features/ProjectAnnotation/context";
import ImageBlock from "../../common/ImageGallery/ImageBlock";

export const ImageGalleryPanelID = "image-gallery-panel";

export function ImageGalleryPanel({
	onImageClick,
}: {
	onImageClick?: () => void;
}) {
	const { state } = useProject();
	const { dispatchAnnotationSession } = useAnnotationSession();

	// The image data list should be sorted by the data.id
	const imageDataList = state.dataList
		.sort((a, b) => a.id - b.id)
		.map((data) => data.imageData);

	return (
		<>
			<div className="main-section__inner">
				<p className="main-section__title">All Images</p>
				<div id="gallery-container" className="gallery-list gallery-list--full">
					{imageDataList.map((imageData, dataId) => (
						<ImageBlock
							key={dataId}
							displayId={dataId + 1}
							imageURl={imageData.imageUrl}
							imageName={imageData.imageName}
							onClick={() => {
								dispatchAnnotationSession({
									type: "SET_CURRENT_DATA_INDEX",
									payload: dataId,
								});
								onImageClick?.();
							}}
						/>
					))}
				</div>
			</div>
			;
		</>
	);
}
