import type { ProjectState } from "../../types/Annotation";
import LogoBlock from "../common/LogoBlock";

export interface HeaderWithNavigationProps {
	projectState: ProjectState;
	title: string;
	prevImage: () => void;
	nextImage: () => void;
	onClick: () => void;
}

export default function HeaderWithNavigation({
	projectState,
	title,
	prevImage,
	nextImage,
	onClick,
}: HeaderWithNavigationProps) {
	return (
		<header className="header">
			<LogoBlock />
			<div className="header__main-side">
				<button
					id="back-to-gallery"
					className="arrow-link arrow-link--prev"
					onClick={onClick}
				>
					<span className="ico-line-arrow-left"></span> All images
				</button>
			</div>
			{projectState.dataList.length > 0 && (
				<div className="header__middle">
					<button
						id="prev-image-button"
						className="circle-arrow circle-arrow--prev"
						onClick={prevImage}
					>
						<span className="ico-circle-arrow-left"></span>
					</button>
					<p className="header__title">
						<span id="progress-info-name">{title}</span>
					</p>
					<button
						id="next-image-button"
						className="circle-arrow circle-arrow--next"
						onClick={nextImage}
					>
						<span className="ico-circle-arrow-right"></span>
					</button>
					<div
						id="progress-bar"
						className="progressbar round-xlarge"
						style={{ width: "0%" }}
					></div>
				</div>
			)}
		</header>
	);
}
