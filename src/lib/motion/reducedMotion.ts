export const prefersReducedMotion = (): boolean =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const transitionDuration = (ms: number): number => (prefersReducedMotion() ? 0 : ms);
