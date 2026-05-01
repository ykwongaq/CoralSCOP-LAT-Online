import { useCallback, useEffect, useRef, useState } from "react";

import ImageDisplayBlock from "./ImageDisplayBlock";
import styles from "./QuickStart.module.css";
import { Button, usePopMessage } from "../../ui";
import { useProject } from "../../../store";
import { loadProject, quickStart } from "../../../services";
import type { ApiRequestHandle, ProjectConfig } from "../../../types";
export const QuickStartUploadImagePanelID = "quick-start-upload-image-panel";
import { FlowBar } from "../../layout";
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

export default function QuickStartUploadImagePanel() {
	const { projectState, projectDispatch } = useProject();
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

	const handleStartAnnotation = useCallback(() => {
		if (!selectedImage || isProcessing) return;

		setIsProcessing(true);
		requestHandleRef.current = quickStart(
			{ image: selectedImage, config },
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
						`${selectedImage.name.replace(/\.[^.]+$/, "")}.coral`,
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
	}, [
		selectedImage,
		isProcessing,
		showLoading,
		showError,
		updateLoadingProgress,
		closeMessage,
		projectState,
	]);

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
		<div className="main-section__inner">
			<p className="main-section__title">Quick Start</p>
			<p className="main-section__desc">
				Upload a single image to start annotating immediately. The server will
				process your image and open it for annotation.
			</p>
			<div className="main-section__content">
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
							<button className="button select-link" onClick={openFileSelect}>
								browse
							</button>{" "}
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
			</div>

			<FlowBar>
				<div className={styles.buttons}>
					{selectedImage && (
						<Button onClick={handleClearImage} disabled={isProcessing}>
							Clear
						</Button>
					)}
					<Button
						onClick={handleStartAnnotation}
						disabled={!selectedImage || isProcessing}
					>
						{isProcessing ? "Processing..." : "Start Annotation"}
					</Button>
				</div>
			</FlowBar>
		</div>
	);
}
