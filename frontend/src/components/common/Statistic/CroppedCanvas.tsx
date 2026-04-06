import { useRef, useEffect } from "react";
import { decodeRLE } from "../../../utils/cocoRle";
import type { Annotation } from "../../../types/Annotation";
import { getMaskBoundingBox } from "../../../services/StatisticService";

interface CroppedCanvasProps {
	imageUrl: string;
	annotation: Annotation;
	imageWidth: number;
	imageHeight: number;
}

/**
 * A canvas component that displays a cropped region of the image
 * showing only the specified annotation mask.
 */
export default function CroppedCanvas({
	imageUrl,
	annotation,
	imageWidth,
	imageHeight,
}: CroppedCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!imageUrl || !annotation) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			// Decode the RLE mask and get bounding box for single annotation
			const mask = decodeRLE(annotation.segmentation);
			const bb = getMaskBoundingBox(mask, imageWidth);
			if (!bb) return;

			const { minX, minY, maxX, maxY } = bb;
			const pad = Math.max(20, Math.floor((maxX - minX + maxY - minY) * 0.05));
			const cropX = Math.max(0, minX - pad);
			const cropY = Math.max(0, minY - pad);
			const cropW = Math.min(imageWidth, maxX + pad) - cropX;
			const cropH = Math.min(imageHeight, maxY + pad) - cropY;

			canvas.width = cropW;
			canvas.height = cropH;
			const ctx = canvas.getContext("2d")!;
			ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
		};
		img.src = imageUrl;
	}, [imageUrl, annotation, imageWidth, imageHeight]);

	return <canvas ref={canvasRef} className="stat-crop-canvas" />;
}
