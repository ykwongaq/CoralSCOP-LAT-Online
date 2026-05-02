import type { ProjectState } from "../../../types";
import LogoBlock from "../../ui/LogoBlock";
import styles from "./HeaderWithNavigation.module.css";

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
		<header className={styles.header}>
			<LogoBlock />
			<div className={styles.headerMainSide}>
				<button
					id="back-to-gallery"
					className={`${styles.arrowLink} ${styles.arrowLinkPrev}`}
					onClick={onClick}
				>
					<span className="ico-line-arrow-left"></span> All images
				</button>
			</div>
			{projectState.dataList.length > 0 && (
				<div className={styles.headerMiddle}>
					<button
						id="prev-image-button"
						className={`${styles.circleArrow} ${styles.circleArrowPrev}`}
						onClick={prevImage}
					>
						<span className="ico-circle-arrow-left"></span>
					</button>
					<p className={styles.headerTitle}>
						<span className={styles.progressInfoName}>{title}</span>
					</p>
					<button
						id="next-image-button"
						className={`${styles.circleArrow} ${styles.circleArrowNext}`}
						onClick={nextImage}
					>
						<span className="ico-circle-arrow-right"></span>
					</button>
					<div
						id="progress-bar"
						style={{ width: "0%" }}
					></div>
				</div>
			)}
		</header>
	);
}
