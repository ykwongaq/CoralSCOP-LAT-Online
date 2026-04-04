export type AnnotationCommand =
	// Shared (both modes)
	| "toggle-masks"
	| "undo"
	| "redo"
	// Select mode
	| "remove"
	| "switch-to-add"
	// Add mode
	| "clear-prompts"
	| "confirm-mask"
	| "switch-to-select";

// Normalise a KeyboardEvent into a lookup key, e.g. "ctrl+z", "tab", "r"
export function normalizeKey(e: KeyboardEvent): string {
	const mods = e.ctrlKey || e.metaKey ? "ctrl+" : "";
	return mods + e.key.toLowerCase();
}

export const KEYMAP: Record<
	"select" | "add",
	Partial<Record<string, AnnotationCommand>>
> = {
	select: {
		tab: "toggle-masks",
		"ctrl+z": "undo",
		"ctrl+y": "redo",
		r: "remove",
		w: "switch-to-add",
	},
	add: {
		tab: "toggle-masks",
		"ctrl+z": "undo",
		"ctrl+y": "redo",
		r: "clear-prompts",
		w: "switch-to-select",
	},
};
