import { type ImageData } from "../ImageData";
import type { Annotation } from "./Annotation";
import type { ScaledLine } from "./ScaledLine";

export interface Data {
  id: number;
  imageData: ImageData;
  annotations: Annotation[];
  scaledLineList: ScaledLine[];
}
