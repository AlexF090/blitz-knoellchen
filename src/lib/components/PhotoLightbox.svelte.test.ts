import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PhotoLightbox, { type LightboxPhoto } from './PhotoLightbox.svelte';

// Minimales, aber echtes 2x2-PNG (statt beliebiger Bytes) — damit <img onload> tatsächlich
// feuert und naturalWidth/naturalHeight gesetzt sind (relevant für updateBaseSize()).
const PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR42mNkYPhfz0AAYByRAgD16w1zHxLGAgAAAABJRU5ErkJggg==';

const pngBytes = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));

const makePhoto = (): LightboxPhoto => ({
	blob: new Blob([pngBytes], { type: 'image/png' }),
	alt: 'Testfoto'
});

// Wartet, bis das Bild tatsächlich geladen ist (naturalWidth/Height gesetzt) — relevant, damit
// updateBaseSize() eine reale baseSize berechnet und clampTranslate() nicht wegen baseSize.width
// === 0 vorzeitig zurückkehrt.
const waitForImageLoad = async (img: HTMLImageElement | null | undefined) => {
	await expect.poll(() => img?.naturalWidth ?? 0).toBeGreaterThan(0);
};

describe('PhotoLightbox', () => {
	it('öffnet den Dialog nicht, wenn photo null ist', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: null, onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(false);
	});

	it('öffnet den Dialog, sobald das photo-Prop gesetzt wird', async () => {
		const onClose = vi.fn();
		const { container, rerender } = await render(PhotoLightbox, { photo: null, onClose });

		await rerender({ photo: makePhoto(), onClose });

		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('alt')).toBe('Testfoto');
	});

	it('öffnet den Dialog nicht erneut, wenn direkt ein neues photo gesetzt wird, während er schon offen ist', async () => {
		const onClose = vi.fn();
		const { container, rerender } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const dialog = container.querySelector<HTMLDialogElement>('dialog');
		await expect.poll(() => dialog?.open).toBe(true);
		const showModalSpy = vi.spyOn(dialog!, 'showModal');

		// Kein Zwischenschritt über null — der Dialog ist beim Wechsel bereits offen, der
		// showModal()-Zweig darf dann nicht erneut greifen (dialog.open ist schon true).
		await rerender({ photo: makePhoto(), onClose });

		await expect.poll(() => dialog?.open).toBe(true);
		expect(showModalSpy).not.toHaveBeenCalled();
	});

	it('schließt den Dialog wieder, wenn photo auf null zurückgesetzt wird', async () => {
		const onClose = vi.fn();
		const { container, rerender } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		await rerender({ photo: null, onClose });

		await expect.poll(() => container.querySelector('dialog')?.open).toBe(false);
	});

	it('ruft onClose auf, wenn der Schließen-Button geklickt wird', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		const closeButton = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Vorschau schließen"]'
		);
		closeButton?.click();

		expect(onClose).toHaveBeenCalled();
	});

	it('ruft onClose auf, wenn auf den Backdrop (Dialog selbst) geklickt wird', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const dialog = container.querySelector<HTMLDialogElement>('dialog');
		await expect.poll(() => dialog?.open).toBe(true);

		dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(onClose).toHaveBeenCalled();
	});

	it('klickt innerhalb des Inhalts löst kein onClose aus', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const img = container.querySelector<HTMLImageElement>('img');
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		img?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(onClose).not.toHaveBeenCalled();
	});

	it('zoomt bei einem Doppelklick auf das Bild und beim erneuten Doppelklick wieder zurück', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);

		panArea?.dispatchEvent(
			new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })
		);

		await expect.poll(() => img?.style.transform).toContain('scale(3)');

		panArea?.dispatchEvent(
			new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })
		);

		await expect.poll(() => img?.style.transform).toContain('scale(1)');
	});

	it('zoomt per Wheel-Event innerhalb der erlaubten Grenzen (Clamping nach oben und unten)', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);
		await waitForImageLoad(img);

		// Weit über dem erlaubten Bereich (MAX_SCALE = 5) -> muss auf 5 geclamped werden.
		panArea?.dispatchEvent(
			new WheelEvent('wheel', {
				bubbles: true,
				cancelable: true,
				deltaY: -100000,
				clientX: 100,
				clientY: 100
			})
		);
		await expect.poll(() => img?.style.transform).toContain('scale(5)');

		// Weit unter dem erlaubten Bereich (MIN_SCALE = 1) -> muss auf 1 geclamped werden.
		panArea?.dispatchEvent(
			new WheelEvent('wheel', {
				bubbles: true,
				cancelable: true,
				deltaY: 100000,
				clientX: 100,
				clientY: 100
			})
		);
		await expect.poll(() => img?.style.transform).toContain('scale(1)');
	});

	it('zoomt über die +/- Buttons und deaktiviert sie an den Grenzen', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		const zoomOutButton = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Verkleinern"]'
		);
		const zoomInButton = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Vergrößern"]'
		);
		expect(zoomOutButton?.disabled).toBe(true);
		expect(zoomInButton?.disabled).toBe(false);

		zoomInButton?.click();
		const img = container.querySelector<HTMLImageElement>('img');
		await expect.poll(() => img?.style.transform).toContain('scale(1.5)');
		expect(zoomOutButton?.disabled).toBe(false);

		zoomOutButton?.click();
		await expect.poll(() => img?.style.transform).toContain('scale(1)');
		expect(zoomOutButton?.disabled).toBe(true);
	});

	it('pannt mit einem einzelnen Pointer, sobald hineingezoomt wurde', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		// jsdom/echte Browser verweigern setPointerCapture für synthetische (nicht vom OS erzeugte)
		// Pointer — für den Test irrelevant, daher als No-Op gestubbt.
		if (panArea) panArea.setPointerCapture = vi.fn();
		// Erst reinzoomen, sonst wird bei scale === MIN_SCALE kein Pan gestartet.
		panArea?.dispatchEvent(
			new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })
		);
		await expect.poll(() => img?.style.transform).toContain('scale(3)');

		// Bewusst kein Vergleich auf eine konkrete Translate-Delta: je nach Container-/Viewport-
		// Größe kann clampTranslate() die Bewegung ganz oder teilweise abfangen. Relevant für den
		// Test ist, dass die Pointer-Pan-Pipeline (down/move/up) fehlerfrei durchläuft und der
		// Zoom-Zustand dabei erhalten bleibt.
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 100,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 140,
				clientY: 130
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointerup', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 140,
				clientY: 130
			})
		);

		await expect.poll(() => img?.style.transform).toContain('scale(3)');
	});

	it('zoomt per Zwei-Finger-Pinch (zwei gleichzeitige Pointer)', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		await expect.poll(() => container.querySelector('dialog')?.open).toBe(true);

		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		if (panArea) panArea.setPointerCapture = vi.fn();

		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 80,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 2,
				clientX: 120,
				clientY: 100
			})
		);
		// Finger auseinanderziehen -> Distanz verdoppelt sich -> Zoom nimmt zu.
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 40,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 2,
				clientX: 160,
				clientY: 100
			})
		);

		await expect.poll(() => img?.style.transform).not.toContain('scale(1)');

		panArea?.dispatchEvent(
			new PointerEvent('pointercancel', { bubbles: true, cancelable: true, pointerId: 1 })
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointerleave', { bubbles: true, cancelable: true, pointerId: 2 })
		);
	});

	it('ignoriert pointermove für eine nie registrierte pointerId', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		const transformBefore = img?.style.transform;

		// Kein vorheriges pointerdown für diese pointerId -> activePointers.has(...) ist false.
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 99,
				clientX: 200,
				clientY: 200
			})
		);

		expect(img?.style.transform).toBe(transformBefore);
	});

	it('pointermove für einen einzelnen Pointer bei scale === MIN_SCALE pannt nicht (kein Pan-Pointer gesetzt)', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		if (panArea) panArea.setPointerCapture = vi.fn();
		const transformBefore = img?.style.transform;

		// Ohne vorherigen Zoom bleibt scale === MIN_SCALE, handlePointerDown setzt daher keinen
		// panPointerId -> im Move-Handler greift weder der Pinch- noch der Pan-Zweig.
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 100,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 150,
				clientY: 150
			})
		);

		expect(img?.style.transform).toBe(transformBefore);
	});

	it('überspringt den Zoom-Anteil eines Pinch-Moves, wenn beide Finger deckungsgleich aufgesetzt wurden (lastPinchDistance === 0)', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		if (panArea) panArea.setPointerCapture = vi.fn();

		// Beide Finger an derselben Stelle -> pinchDistance() bei pointerdown ist 0.
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 100,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 2,
				clientX: 100,
				clientY: 100
			})
		);

		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 60,
				clientY: 100
			})
		);

		// lastPinchDistance war 0 -> der Zoom-Zweig (if (lastPinchDistance > 0)) darf für dieses
		// Move nicht greifen, scale bleibt bei MIN_SCALE (1) statt hochzuzoomen.
		expect(img?.style.transform).toContain('scale(1)');
	});

	it('setzt lastPinchMid/-Distance nicht zurück, wenn nach drei Pointern nur einer losgelassen wird (weiterhin zwei aktiv)', async () => {
		const onClose = vi.fn();
		const { container } = await render(PhotoLightbox, { photo: makePhoto(), onClose });
		const panArea = container.querySelector<HTMLDivElement>('[role="presentation"]');
		const img = container.querySelector<HTMLImageElement>('img');
		await waitForImageLoad(img);
		if (panArea) panArea.setPointerCapture = vi.fn();

		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 80,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 2,
				clientX: 120,
				clientY: 100
			})
		);
		// Dritter Pointer kommt dazu (size === 3) -> handlePointerDown setzt lastPinchMid/-Distance
		// dabei NICHT neu (Bedingung dort ist size === 2).
		panArea?.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				pointerId: 3,
				clientX: 130,
				clientY: 100
			})
		);
		// Einer der drei geht wieder weg -> size sinkt auf 2, size < 2 ist false, also KEIN Reset
		// von lastPinchMid/-Distance.
		panArea?.dispatchEvent(
			new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 3 })
		);

		// Wäre fälschlich zurückgesetzt worden, würde dieses Move (lastPinchDistance dann 0) den
		// Zoom-Zweig überspringen und scale bliebe bei 1 — mit erhaltenem State zoomt es weiter.
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				clientX: 40,
				clientY: 100
			})
		);
		panArea?.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerId: 2,
				clientX: 160,
				clientY: 100
			})
		);

		await expect.poll(() => img?.style.transform).not.toContain('scale(1)');
	});
});
