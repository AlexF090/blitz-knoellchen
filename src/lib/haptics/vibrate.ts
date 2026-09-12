export type HapticPattern = 'success' | 'warning' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
	success: 15,
	warning: [20, 40, 20],
	selection: 8
};

export const triggerHaptic = (pattern: HapticPattern): void => {
	if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
	navigator.vibrate(PATTERNS[pattern]);
};
