import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { reloadWithLatestVersion } from '$lib/pwa/reloadLatest';
import PullToRefresh from './PullToRefresh.svelte';

vi.mock('$lib/pwa/reloadLatest', () => ({
	reloadWithLatestVersion: vi.fn().mockResolvedValue(undefined)
}));

const mockedReload = vi.mocked(reloadWithLatestVersion);

const childrenSnippet = createRawSnippet(() => ({
	render: () => `<p>Inhalt</p>`
}));

const makeTouch = (target: EventTarget, clientY: number, identifier = 1) =>
	new Touch({ identifier, target, clientX: 0, clientY });

const touchStart = (el: Element, clientY: number) =>
	el.dispatchEvent(
		new TouchEvent('touchstart', {
			bubbles: true,
			cancelable: true,
			touches: [makeTouch(el, clientY)]
		})
	);

const touchMove = (el: Element, clientY: number) =>
	el.dispatchEvent(
		new TouchEvent('touchmove', {
			bubbles: true,
			cancelable: true,
			touches: [makeTouch(el, clientY)]
		})
	);

const touchEnd = (el: Element) =>
	el.dispatchEvent(
		new TouchEvent('touchend', {
			bubbles: true,
			cancelable: true,
			touches: []
		})
	);

afterEach(() => {
	vi.clearAllMocks();
});

describe('PullToRefresh', () => {
	it('löst kein Reload aus, wenn unterhalb des Thresholds losgelassen wird', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		expect(target).not.toBeNull();

		touchStart(target!, 200);
		touchMove(target!, 240); // delta 40 * DAMPING 0.5 = 20 < PULL_THRESHOLD (72)
		touchEnd(target!);

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(mockedReload).not.toHaveBeenCalled();
	});

	it('löst reloadWithLatestVersion aus, wenn über dem Threshold losgelassen wird, und zeigt den Refreshing-State', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');
		const spinnerWrapper = overlay?.querySelector<HTMLDivElement>('.rounded-full');
		expect(target).not.toBeNull();

		touchStart(target!, 200);
		touchMove(target!, 400); // delta 200 * DAMPING 0.5 = 100 >= PULL_THRESHOLD (72)
		touchEnd(target!);

		await expect.poll(() => mockedReload).toBeCalledTimes(1);
		// refreshing bleibt true (kein echter Reload im Test) -> style:opacity/transform springen
		// auf den fixen refreshing-Zustand statt weiter progress zu folgen.
		await expect.poll(() => overlay?.style.opacity).toBe('1');
		await expect.poll(() => spinnerWrapper?.style.transform).toBe('scale(1)');
	});

	it('aktualisiert die sichtbare Zug-Anzeige proportional zum pullDistance-Fortschritt', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');
		expect(overlay).not.toBeNull();

		// Vor dem Ziehen: keine Bewegung, keine Sichtbarkeit erwartet.
		expect(overlay?.style.opacity).toBe('0');

		touchStart(target!, 200);
		touchMove(target!, 260); // delta 60 * DAMPING 0.5 = 30 -> progress = 30/72

		await expect.poll(() => Number(overlay?.style.opacity)).toBeCloseTo(30 / 72, 5);

		touchEnd(target!);
	});

	it('bricht den Pull ab, wenn die Bewegung nach oben statt unten geht', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');

		touchStart(target!, 200);
		touchMove(target!, 150); // delta negativ -> pulling wird abgebrochen

		await expect.poll(() => overlay?.style.opacity).toBe('0');

		touchEnd(target!);
		expect(mockedReload).not.toHaveBeenCalled();
	});

	it('ignoriert einen weiteren touchstart, während bereits refreshing=true ist', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');

		// Erst regulär über den Threshold ziehen -> refreshing wird true.
		touchStart(target!, 200);
		touchMove(target!, 400);
		touchEnd(target!);
		await expect.poll(() => mockedReload).toBeCalledTimes(1);

		// Ein weiterer touchstart während refreshing=true darf keinen neuen Pull beginnen
		// (onTouchStart: if (refreshing || !atTop()) return;) — die Anzeige bleibt im
		// Refreshing-Zustand statt auf den neuen Pull zu reagieren.
		touchStart(target!, 500);
		touchMove(target!, 700);

		expect(overlay?.style.opacity).toBe('1');
		expect(mockedReload).toHaveBeenCalledTimes(1);
	});

	it('ignoriert touchstart, wenn die Seite nicht am oberen Rand ist (scrollTop > 0)', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');
		const scrollingElement = document.scrollingElement as HTMLElement;
		const scrollTopSpy = vi.spyOn(scrollingElement, 'scrollTop', 'get').mockReturnValue(50);

		try {
			touchStart(target!, 200);
			touchMove(target!, 400); // wäre ohne den atTop()-Guard weit über dem Threshold

			expect(overlay?.style.opacity).toBe('0');
			expect(mockedReload).not.toHaveBeenCalled();
		} finally {
			scrollTopSpy.mockRestore();
		}
	});

	it('ignoriert touchmove ohne vorherigen touchstart (pulling === false)', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		const target = container.querySelector('[role="presentation"]');
		const overlay = container.querySelector<HTMLDivElement>('.pointer-events-none');

		// Kein touchStart(...) davor -> pulling ist false, onTouchMove muss früh zurückkehren.
		touchMove(target!, 400);

		expect(overlay?.style.opacity).toBe('0');
		expect(mockedReload).not.toHaveBeenCalled();
	});

	it('rendert die übergebenen children', async () => {
		const { container } = render(PullToRefresh, { children: childrenSnippet });
		expect(container.textContent).toContain('Inhalt');
	});
});
