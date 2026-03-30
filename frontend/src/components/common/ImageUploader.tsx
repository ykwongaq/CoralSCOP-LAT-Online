import type { ImageSelectionData } from "../../types/projectCreation";
import { useImageUploader } from "../../hooks/useImageUploader";
import "../../App.css";

interface ImageUploaderProps {
  onImages: (images: ImageSelectionData[]) => void;
}

export default function ImageUploader({ onImages }: ImageUploaderProps) {
  const {
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    openFolderSelect,
  } = useImageUploader(onImages);

  return (
    <div
      className={`drop-container${isDragging ? " drop-container--active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-text">
        Drop images here. Or select{" "}
        <button className="button select-link" onClick={openFolderSelect}>
          image folder
        </button>{" "}
        containing the images.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        {...({
          webkitdirectory: "",
          directory: "",
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
    </div>
  );
}
