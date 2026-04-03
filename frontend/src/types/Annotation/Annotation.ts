import { type RLE } from "./RLE";

export interface Annotation {
  // Coco encoded rle segmentation
  segmetnation: RLE;

  // Label ID
  labelId: number;
}
