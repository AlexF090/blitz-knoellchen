import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import DraftResumeBanner from './DraftResumeBanner.svelte';

const savedAt = Date.UTC(2026, 10, 19, 13, 32);

let currentUnmount: (() => Promise<void>) | undefined;

const renderBanner = async (
	overrides: Partial<Parameters<typeof render<typeof DraftResumeBanner>>[1]> = {}
) => {
	const onResume = vi.fn();
	const onDiscard = vi.fn();
	const result = await render(DraftResumeBanner, {
		savedAt,
		vehicleCount: 2,
		photoCount: 5,
		onResume,
		onDiscard,
		...overrides
	});
	currentUnmount = result.unmount;
	return { onResume, onDiscard };
};

afterEach(async () => {
	await currentUnmount?.();
	currentUnmount = undefined;
});

describe('DraftResumeBanner', () => {
	it('nennt Zeitpunkt, Fahrzeug- und Fotoanzahl im Plural', async () => {
		await renderBanner();

		await expect
			.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
			.toMatchTextContent(
				'Ungesendeter Entwurf vom 19.11.2026, 14:32 mit 2 Fahrzeugen und 5 Fotos'
			);
	});

	it('verwendet bei je einem Fahrzeug und Foto den Singular', async () => {
		await renderBanner({ vehicleCount: 1, photoCount: 1 });

		await expect
			.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
			.toMatchTextContent('mit 1 Fahrzeug und 1 Foto');
	});

	it('zählt Fahrzeuge und Fotos unabhängig voneinander im Singular oder Plural', async () => {
		await renderBanner({ vehicleCount: 1, photoCount: 4 });
		await expect
			.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
			.toMatchTextContent('mit 1 Fahrzeug und 4 Fotos');
	});

	it('zeichnet den Zeitpunkt als time-Element mit ISO-Zeitstempel aus', async () => {
		const { container, unmount } = await render(DraftResumeBanner, {
			savedAt,
			vehicleCount: 2,
			photoCount: 5,
			onResume: vi.fn(),
			onDiscard: vi.fn()
		});
		currentUnmount = unmount;

		const time = container.querySelector('time');
		expect(time?.getAttribute('datetime')).toBe(new Date(savedAt).toISOString());
		expect(time?.textContent).toBe('19.11.2026, 14:32');
	});

	it('ist ein benannter Bereich mit Überschrift', async () => {
		await renderBanner();

		await expect
			.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
			.toBeInTheDocument();
	});

	it('ruft onResume über „Fortsetzen“ auf', async () => {
		const { onResume, onDiscard } = await renderBanner();

		await userEvent.click(page.getByRole('button', { name: 'Fortsetzen' }));

		expect(onResume).toHaveBeenCalledTimes(1);
		expect(onDiscard).not.toHaveBeenCalled();
	});

	it('ruft onDiscard über „Verwerfen“ auf', async () => {
		const { onResume, onDiscard } = await renderBanner();

		await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }));

		expect(onDiscard).toHaveBeenCalledTimes(1);
		expect(onResume).not.toHaveBeenCalled();
	});
});
