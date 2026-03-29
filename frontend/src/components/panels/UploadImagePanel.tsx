import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from "react";
import {
    buildImageKey,
    collectImageFilesFromDataTransfer,
    collectImageFilesFromInput,
} from "./uploadImagePanelUtils";

export const UploadImagePanelID = "upload-image-panel";

interface UploadedImage {
    key: string;
    file: File;
    previewUrl: string;
    selected: boolean;
}

export default function UploadImagePanel() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const imagesRef = useRef<UploadedImage[]>([]);

    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => {
                URL.revokeObjectURL(image.previewUrl);
            });
        };
    }, []);

    const appendFiles = useCallback((files: File[]) => {
        if (files.length === 0) {
            return;
        }

        setImages((currentImages) => {
            const existingKeys = new Set(currentImages.map((image) => image.key));
            const nextImages = [...currentImages];

            files.forEach((file) => {
                const key = buildImageKey(file);
                if (existingKeys.has(key)) {
                    return;
                }

                existingKeys.add(key);
                nextImages.push({
                    key,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    selected: true,
                });
            });

            return nextImages;
        });
    }, []);

    const handleFileSelection = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            appendFiles(collectImageFilesFromInput(event.target.files));
            event.target.value = "";
        },
        [appendFiles],
    );

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
        }
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragActive(false);
        appendFiles(await collectImageFilesFromDataTransfer(event.dataTransfer));
    }, [appendFiles]);

    const toggleImageSelection = useCallback((key: string) => {
        setImages((currentImages) =>
            currentImages.map((image) =>
                image.key === key ? { ...image, selected: !image.selected } : image,
            ),
        );
    }, []);

    const selectAllImages = useCallback(() => {
        setImages((currentImages) =>
            currentImages.map((image) => ({ ...image, selected: true })),
        );
    }, []);

    const deselectAllImages = useCallback(() => {
        setImages((currentImages) =>
            currentImages.map((image) => ({ ...image, selected: false })),
        );
    }, []);

    const selectedCount = images.filter((image) => image.selected).length;
    const hasImages = images.length > 0;

    return (
        <div className="main-section__inner">
            <p className="main-section__title">Upload Images</p>
            <div className="main-section__content">
                <div
                    id="drop-container"
                    className={`drop-container${isDragActive ? " drop-container--active" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="drop-text">
                        Drop images here. Or select
                        <button
                            id="select-link"
                            type="button"
                            className="button select-link"
                            onClick={handleBrowseClick}
                        >
                            image folder
                        </button>
                        containing the images.
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="file-input"
                        multiple
                        webkitdirectory=""
                        directory=""
                        style={{ display: "none" }}
                        onChange={handleFileSelection}
                    />
                </div>

                <div id="gallery-item-container" className="gallery-list gallery-list--full">
                    {hasImages ? (
                        images.map((image) => (
                            <label key={image.key} className="gallery-list__item gallery-item">
                                <input
                                    type="checkbox"
                                    checked={image.selected}
                                    onChange={() => toggleImageSelection(image.key)}
                                />
                                <div className="gallery-item__img-w">
                                    <img className="gallery-item__img" src={image.previewUrl} alt={image.file.name} />
                                </div>
                                <p className="gallery-item__name">
                                    <span className="gallery-item__text">{image.file.name}</span>
                                </p>
                            </label>
                        ))
                    ) : (
                        <p className="upload-panel__empty-state">
                            No images loaded yet. Drop a folder here or use the folder picker.
                        </p>
                    )}
                </div>
            </div>
            <div className="main-section__bottom">
                <button
                    id="deselect-all-button"
                    type="button"
                    className="button button--border"
                    onClick={deselectAllImages}
                    disabled={!hasImages}
                >
                    Deselect All
                </button>
                <button
                    id="select-all-button"
                    type="button"
                    className="button button--border"
                    onClick={selectAllImages}
                    disabled={!hasImages}
                >
                    Select All
                </button>
                <button
                    id="create-project-button"
                    type="button"
                    disabled={selectedCount === 0}
                    className="button"
                >
                    Create ({selectedCount})
                </button>
            </div>
        </div>
    );
}
