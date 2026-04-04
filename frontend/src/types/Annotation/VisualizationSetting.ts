import { type Label } from "./";

export interface VisualizationSetting {
	// Labels that user choose not to visualize
	hiddingLabels: Label[];

	showMasks: boolean;

	maskOpacity: number;

	brightness: number;

	contrast: number;

	saturation: number;
}
