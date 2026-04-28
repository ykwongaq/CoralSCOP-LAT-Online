import { useState } from "react";
import ImageBlockWithSelection from "./ImageBlockWithSelection";
import type { ImageData } from "../../../types";
import styles from "./ImageGallery.module.css";

interface ImageGalleryProps {
	imageDataList: ImageData[];
	onSelectionChange?: (selectedImages: ImageData[]) => void;
}

export default function ImageGallery({
	imageDataList,
	onSelectionChange,
}: ImageGalleryProps) {
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
		() => new Set(imageDataList.map((_, i) => i)),
	);

	const handleToggle = (index: number) => {
		setSelectedIndices((prev) => {
			const next = new Set(prev);
			next.has(index) ? next.delete(index) : next.add(index);
			onSelectionChange?.(imageDataList.filter((_, i) => next.has(i)));
			return next;
		});
	};

	return (
		<div
			id="gallery-item-container"
			className={`${styles.galleryList} ${styles.galleryListFull}`}
		>
			{imageDataList.map((imageData, index) => (
				<ImageBlockWithSelection
					key={index}
					id={index}
					imageUrl={imageData.imageUrl}
					imageName={imageData.imageName}
					selected={selectedIndices.has(index)}
					onToggle={() => handleToggle(index)}
				/>
			))}
		</div>
	);
}
