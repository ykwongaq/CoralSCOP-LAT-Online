import { createContext, useContext } from "react";
import type { VisualizationSetting } from "../../types/Annotation/VisualizationSetting";

export const initialVisualizationSetting: VisualizationSetting = {
	hiddingLabels: [],
	showMasks: true,
	maskOpacity: 0.4,
	brightness: 100,
	contrast: 100,
	saturation: 100,
	pendingMaskOpacity: 0.7,
};

export const VisualizationSettingContext = createContext<{
	visualizationSetting: VisualizationSetting;
	updateVisualizationSetting: (patch: Partial<VisualizationSetting>) => void;
} | null>(null);

export function useVisualizationSetting() {
	const context = useContext(VisualizationSettingContext);
	if (!context) {
		throw new Error(
			"useVisualizationSetting must be used within a VisualizationSettingProvider",
		);
	}
	return context;
}
