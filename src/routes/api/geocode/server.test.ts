import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from './$types';

vi.mock('$env/static/private', () => ({ LOCATIONIQ_API_KEY: 'test-key' }));

const waitForSlotMock = vi.fn<(minIntervalMs: number) => Promise<void>>(async () => {});
vi.mock('$lib/geocode/rateLimiter', () => ({
	LOCATIONIQ_MIN_INTERVAL_MS: 1000,
	waitForSlot: (minIntervalMs: number) => waitForSlotMock(minIntervalMs)
}));

const reverseGeocodeMock = vi.fn();
vi.mock('$lib/geocode/reverseGeocode', () => ({
	createLocationIqProvider: vi.fn((apiKey: string) => ({ name: 'locationiq', apiKey })),
	createBigDataCloudProvider: vi.fn(() => ({ name: 'bigdatacloud' })),
	reverseGeocode: (lat: number, lon: number, providers: unknown[]) =>
		reverseGeocodeMock(lat, lon, providers)
}));

// Minimaler RequestEvent-Mock: `+server.ts` nutzt nur `url` und `fetch` aus dem Event.
const buildEvent = (search: string): RequestEvent =>
	({
		url: new URL(`http://localhost/api/geocode${search}`),
		fetch: vi.fn()
	}) as unknown as RequestEvent;

describe('GET /api/geocode', () => {
	it('liefert 400, wenn lat/lon ungültig sind', async () => {
		const { GET } = await import('./+server');
		const response = await GET(buildEvent('?lat=abc&lon=6.9') as never);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'lat/lon fehlen oder sind ungültig.' });
		expect(waitForSlotMock).not.toHaveBeenCalled();
	});

	it('liefert 400, wenn lon ungültig ist', async () => {
		const { GET } = await import('./+server');
		const response = await GET(buildEvent('?lat=50.9&lon=abc') as never);

		expect(response.status).toBe(400);
	});

	it('wartet auf einen Slot und liefert die Adresse bei Erfolg', async () => {
		reverseGeocodeMock.mockResolvedValueOnce({
			address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' },
			error: null
		});
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?lat=50.9&lon=6.9') as never);

		expect(waitForSlotMock).toHaveBeenCalledWith(1000);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
		});
	});

	it('liefert 502 mit Fehlermeldung, wenn keine Adresse ermittelt werden konnte', async () => {
		reverseGeocodeMock.mockResolvedValueOnce({
			address: null,
			error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
		});
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?lat=50.9&lon=6.9') as never);

		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({
			error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
		});
	});
});
