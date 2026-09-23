/** Meldet, ob das System auf reduzierte Bewegung eingestellt ist (serverseitig immer `false`). */
export const prefersReducedMotion = (): boolean =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Liefert die Übergangsdauer, oder 0 bei aktivierter Bewegungsreduktion. */
export const transitionDuration = (ms: number): number => (prefersReducedMotion() ? 0 : ms);
