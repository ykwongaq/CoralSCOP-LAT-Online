interface ImageBlockProps {
	imageURl: string;
	imageName: string;
	displayId: number;
	onClick: () => void;
}

export default function ImageBlock({
	imageURl,
	imageName,
	displayId,
	onClick,
}: ImageBlockProps) {
	return (
		<button className="gallery-list__item gallery-item" onClick={onClick}>
			<div className="gallery-item__img-w">
				<img className="gallery-item__img" src={imageURl} alt={imageName} />
			</div>
			<p className="name gallery-item__name">
				<span className="gallery-item__text">
					{displayId}. {imageName}
				</span>
			</p>
		</button>
	);
}
