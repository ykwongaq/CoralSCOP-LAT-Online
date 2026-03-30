import ImageBlockWithSelection from "./ImageBlockWithSelection";
import type { ImageSelectionData } from "../../../types/projectCreation";

interface ImageGalleryProps {
  imageDataList: ImageSelectionData[];
  onToggleSelection?: (index: number) => void;
}

export default function ImageGallery({
  imageDataList,
  onToggleSelection,
}: ImageGalleryProps) {
  return (
    <div
      id="gallery-item-container"
      className="gallery-list gallery-list--full"
    >
      {imageDataList.map((imageData, index) => (
        <ImageBlockWithSelection
          key={index}
          id={index}
          imageUrl={imageData.imageUrl}
          imageName={imageData.imageName}
          selected={imageData.selected}
          onToggle={() => onToggleSelection?.(index)}
        />
      ))}
    </div>
  );
}
