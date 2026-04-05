import { useCallback, useRef, useState } from "react";
import BottomBar from "../../layout/BottomBar";
import Button from "../../common/Button";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { usePopMessage } from "../../common/PopUpMessages/PopMessageContext";
import { loadProject } from "../../../services/LoadProjectService";
import { quickStart } from "../../../services/QuickStartService";
import type { ApiRequestHandle } from "../../../types/api";
import type { ProjectConfig } from "../../../types/ProjectCreation";
import {
	SettingGroups,
	SettingSliderBlock,
} from "../../common/Settings";

export const QuickStartUploadImagePanelID = "quick-start-upload-image-panel";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

const DEFAULT_CONFIG: ProjectConfig = {
	min_area: 0.001,
	min_confidence: 0.5,
	max_overlap: 0.001,
};

export default function QuickStartUploadImagePanel() {
	const { dispatch } = useProject();
	const { showLoading, showError, updateLoadingProgress, closeMessage } =
		usePopMessage();

	const [isDragging, setIsDragging] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const requestHandleRef = useRef<ApiRequestHandle | null>(null);

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
		if (!selectedImage) return;

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
									closeMessage();
								},
							},
						],
					});
				},
				onError: (err) => {
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
							showError({
								title: "Failed to Load Project",
								content: "An error occurred while loading the project.",
								errorMessage: err.message,
								buttons: [{ label: "Close", onClick: closeMessage }],
							});
						},
						onComplete: (state) => {
							closeMessage();
							dispatch({ type: "LOAD_PROJECT", payload: state });
						},
					});
				},
			},
		);
	}, [
		selectedImage,
		config,
		showLoading,
		showError,
		updateLoadingProgress,
		closeMessage,
		dispatch,
	]);

	return (
		<div className="main-section__inner">
			<p className="main-section__title">Quick Start</p>
			<p className="main-section__desc">
				Upload a single image to start annotating immediately. The server will
				process your image and open it for annotation.
			</p>
			<div className="main-section__content">
				<div
					className={`drop-container drop-container--large${isDragging ? " drop-container--active" : ""}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className="drop-text">
						{selectedImage ? (
							<span>{selectedImage.name}</span>
						) : (
							<>
								Drop an image here. Or{" "}
								<button className="button select-link" onClick={openFileSelect}>
									browse
								</button>{" "}
								to select a file.
							</>
						)}
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept={ACCEPTED_IMAGE_TYPES.join(",")}
						style={{ display: "none" }}
						onChange={handleFileInputChange}
					/>
				</div>

				<SettingGroups>
					<SettingSliderBlock
						title="Min Area:"
						description="Filter out masks that are too small. (in % of pixel area of the image). Range (0-20)"
						id="qs-min-area"
						defaultValue={config.min_area * 100}
						minValue={0}
						maxValue={20}
						step={0.1}
						onChange={(v) =>
							setConfig((c) => ({ ...c, min_area: v / 100 }))
						}
					/>
					<SettingSliderBlock
						title="Min Confidence:"
						description="Filter out masks with low confidence. (in %)"
						id="qs-min-confidence"
						defaultValue={config.min_confidence * 100}
						minValue={0}
						maxValue={100}
						step={1}
						onChange={(v) =>
							setConfig((c) => ({ ...c, min_confidence: v / 100 }))
						}
					/>
					<SettingSliderBlock
						title="Max Overlap:"
						description="Filter out masks that overlap too much with other masks. Overlap measured by IoU. (in %)"
						id="qs-max-overlap"
						defaultValue={config.max_overlap * 100}
						minValue={0}
						maxValue={50}
						step={0.1}
						onChange={(v) =>
							setConfig((c) => ({ ...c, max_overlap: v / 100 }))
						}
					/>
				</SettingGroups>
			</div>

			<BottomBar>
				<Button onClick={handleStartAnnotation} disabled={!selectedImage}>
					Start Annotation
				</Button>
			</BottomBar>
		</div>
	);
}
