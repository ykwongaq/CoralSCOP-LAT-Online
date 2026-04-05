interface ImageDisplayBlockProps {
	imagePreview: string;
}

export default function ImageDisplayBlock({ imagePreview }: ImageDisplayBlockProps) {
	return (
		<div className="image-display-block">
			<img
				src={imagePreview}
				alt="Preview"
				className="image-display-block__img"
			/>
		</div>
	);
}
