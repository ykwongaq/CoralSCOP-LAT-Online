import { type CocoCategory } from "./CocoCategory";

import { type CocoAnnotation } from "./CocoAnnotation";
export interface AnnotationFile {
	image: {
		image_filename: string;
		image_width: number;
		image_height: number;
		id: number;
	};
	annotations: CocoAnnotation[];
	categories: CocoCategory[];
}
