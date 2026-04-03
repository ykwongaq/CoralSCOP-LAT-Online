import { type ImageData } from "../ImageData";
import type { Annotation } from "./Annotation";

export interface Data {
  id: number;
  imageData: ImageData;
  annotations: Annotation[];
}
