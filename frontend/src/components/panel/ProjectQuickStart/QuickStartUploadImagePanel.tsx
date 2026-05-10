import { useCallback, useEffect, useRef, useState } from "react";

import ImageDisplayBlock from "./ImageDisplayBlock";
import styles from "./QuickStartUploadImage.module.css";
import layoutStyles from "../PanelLayout.module.css";
import { Button, usePopMessage } from "../../ui";
import { useProject } from "../../../store";
import { loadProject, quickStart } from "../../../services";
import type { ApiRequestHandle, ProjectConfig } from "../../../types";
export const QuickStartUploadImagePanelID = "quick-start-upload-image-panel";
import { BottomBar } from "../../layout";

const ACCEPTED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/tiff",
];

const DEFAULT_CONFIG: ProjectConfig = {
	min_area: 0.001,
	min_confidence: 0.5,
	max_overlap: 0.001,
};

const sampleImageModules = import.meta.glob<{ default: string }>(
	'../../../assets/samples/*',
	{ eager: true }
);

const SAMPLE_IMAGES = Object.entries(sampleImageModules).map(([path, module]) => ({
	name: path.split('/').pop() || 'Sample',
	path: module.default,
}));

export default function QuickStartUploadImagePanel() {
	const { projectDispatch } = useProject();
	const { showLoading, showError, updateLoadingProgress, closeMessage } =
		usePopMessage();

	const [isDragging, setIsDragging] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const requestHandleRef = useRef<ApiRequestHandle | null>(null);

	const config = DEFAULT_CONFIG;

	const isImageFile = (file: File) => ACCEPTED_IMAGE_TYPES.includes(file.type);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file && isImageFile(file)) {
			setSelectedImage(file);
		}
	}, []);

	const handleClearImage = useCallback(() => {
		setSelectedImage(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file && isImageFile(file)) {
				setSelectedImage(file);
			}
		},
		[],
	);

	const openFileSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const processImage = useCallback((image: File, imageName: string, projectId?: string) => {
		setIsProcessing(true);
		requestHandleRef.current = quickStart(
			{ image, config, projectId },
			{
				onLoading: () => {
					showLoading({
						title: "Preparing Annotation",
						content: "Processing your image, please wait…",
						progress: null,
						buttons: [
							{
								label: "Cancel",
								onClick: () => {
									requestHandleRef.current?.cancel();
									requestHandleRef.current = null;
									setIsProcessing(false);
									closeMessage();
								},
							},
						],
					});
				},
				onError: (err) => {
					setIsProcessing(false);
					showError({
						title: "Quick Start Failed",
						content: "An error occurred while processing the image.",
						errorMessage: err.message,
						buttons: [{ label: "Close", onClick: closeMessage }],
					});
				},
				onComplete: (blob) => {
					const coralFile = new File(
						[blob],
						`${imageName.replace(/\.[^.]+$/, "")}.coral`,
						{ type: "application/octet-stream" },
					);

					void loadProject(coralFile, {
						onProgress: (pct) => {
							updateLoadingProgress(pct);
						},
						onError: (err) => {
							setIsProcessing(false);
							showError({
								title: "Failed to Load Project",
								content: "An error occurred while loading the project.",
								errorMessage: err.message,
								buttons: [{ label: "Close", onClick: closeMessage }],
							});
						},
						onComplete: (state) => {
							closeMessage();
							setIsProcessing(false);
							projectDispatch({ type: "LOAD_PROJECT", payload: state });
						},
					});
				},
			},
		);
	}, [config, showLoading, showError, updateLoadingProgress, closeMessage, projectDispatch]);

	const handleStartAnnotation = useCallback(() => {
		if (!selectedImage || isProcessing) return;
		processImage(selectedImage, selectedImage.name);
	}, [selectedImage, isProcessing, processImage]);

	const handleLoadSampleImage = useCallback((imagePath: string, imageName: string) => {
		if (isProcessing) return;

		fetch(imagePath)
			.then((response) => response.blob())
			.then((blob) => {
				const file = new File([blob], imageName, { type: blob.type });
				const projectId = imageName.replace(/\.[^.]+$/, "");
				processImage(file, imageName, projectId);
			})
			.catch((error) => {
				console.error("Failed to load sample image:", error);
				showError({
					title: "Failed to Load Sample",
					content: "Could not load the sample image.",
					errorMessage: error.message,
					buttons: [{ label: "Close", onClick: closeMessage }],
				});
			});
	}, [isProcessing, processImage, showError, closeMessage]);

	useEffect(() => {
		if (selectedImage) {
			const url = URL.createObjectURL(selectedImage);
			setImagePreview(url);
			return () => URL.revokeObjectURL(url);
		} else {
			setImagePreview(null);
		}
	}, [selectedImage]);

	return (
		<div className={layoutStyles.mainSectionInner}>
			<p className={layoutStyles.mainSectionTitle}>Quick Start</p>
			<p>
				Upload a single image to start annotating immediately. The server will
				process your image and open it for annotation.
			</p>
			<div className={layoutStyles.mainSectionContent}>
				{imagePreview ? (
					<ImageDisplayBlock imagePreview={imagePreview} />
				) : (
					<div
						className={`${styles.dropContainer} ${styles.dropContainerLarge}${isDragging ? ` ${styles.dropContainerActive}` : ""}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<div className={styles.dropText}>
							Drop an image here. Or{" "}
							<Button
								label="browse"
								onClick={openFileSelect}
								className={styles.selectLink}
							/>
							to select a file.
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept={ACCEPTED_IMAGE_TYPES.join(",")}
							style={{ display: "none" }}
							onChange={handleFileInputChange}
						/>
					</div>
				)}

				<div className={styles.sampleImagesSection}>
					<p className={styles.sampleImagesTitle}>Or start with a sample image:</p>
					<div className={styles.sampleImagesBar}>
						{SAMPLE_IMAGES.map((sample) => (
							<button
								key={sample.name}
								className={styles.sampleImageItem}
								onClick={() => handleLoadSampleImage(sample.path, sample.name)}
								disabled={isProcessing}
								title={sample.name}
							>
								<img
									src={sample.path}
									alt={sample.name}
									className={styles.sampleImage}
								/>
								<span className={styles.sampleImageLabel}>{sample.name}</span>
							</button>
						))}
					</div>
				</div>
			</div>

			<BottomBar>
				<div className={styles.buttons}>
					{selectedImage && (
						<Button
							onClick={handleClearImage}
							disabled={isProcessing}
							className={styles.flowBarButton}
						>
							Clear
						</Button>
					)}
					<Button
						onClick={handleStartAnnotation}
						disabled={!selectedImage || isProcessing}
						className={styles.flowBarButton}
					>
						{isProcessing ? "Processing..." : "Start Annotation"}
					</Button>
				</div>
			</BottomBar>
		</div>
	);
}
