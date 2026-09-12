import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, transitionDuration } from './reducedMotion';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
	window.matchMedia = originalMatchMedia;
});

const stubMatchMedia = (matches: boolean) => {
	window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

describe('prefersReducedMotion', () => {
	it('gibt true zurück, wenn der Nutzer reduzierte Bewegung eingestellt hat', () => {
		stubMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);
	});

	it('gibt false zurück, wenn keine Präferenz gesetzt ist', () => {
		stubMatchMedia(false);
		expect(prefersReducedMotion()).toBe(false);
	});
});

describe('transitionDuration', () => {
	it('gibt die übergebene Dauer unverändert zurück, wenn Bewegung erlaubt ist', () => {
		stubMatchMedia(false);
		expect(transitionDuration(200)).toBe(200);
	});

	it('gibt 0 zurück, wenn reduzierte Bewegung bevorzugt wird', () => {
		stubMatchMedia(true);
		expect(transitionDuration(200)).toBe(0);
	});
});
