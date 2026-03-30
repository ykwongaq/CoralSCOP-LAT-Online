import { type ImageSelectionData } from "../../../types/projectCreation";

interface ImageBlockProps extends ImageSelectionData {
  id: number;
  onToggle?: () => void;
}

export default function ImageBlockWithSelection({
  id,
  imageUrl,
  imageName,
  selected,
  onToggle,
}: ImageBlockProps) {
  return (
    <label className="gallery-list__item gallery-item">
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div className="gallery-item__img-w">
        <img className="gallery-item__img" src={imageUrl} alt={imageName} />
      </div>
      <p className="name gallery-item__name">
        <span className="gallery-item__text">
          {id}. {imageName}
        </span>
      </p>
    </label>
  );
}
