import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from './$types';

vi.mock('$app/env/private', () => ({ GEOAPIFY_API_KEY: 'test-key' }));

const tryConsumeMock = vi.fn(async (key: string) => {
	void key;
	return true;
});
vi.mock('#lib/server/rateLimiters.ts', () => ({
	getGeocodeRateLimiter: () => ({ tryConsume: (key: string) => tryConsumeMock(key) })
}));

const waitForSlotMock = vi.fn<(minIntervalMs: number) => Promise<void>>(async () => {});
vi.mock('#lib/geocode/rateLimiter.ts', () => ({
	GEOAPIFY_MIN_INTERVAL_MS: 1000,
	waitForSlot: (minIntervalMs: number) => waitForSlotMock(minIntervalMs)
}));

const reverseGeocodeMock = vi.fn();
vi.mock('#lib/geocode/reverseGeocode.ts', () => ({
	createGeoapifyProvider: vi.fn((apiKey: string) => ({ name: 'geoapify', apiKey })),
	reverseGeocode: (lat: number, lon: number, providers: unknown[]) =>
		reverseGeocodeMock(lat, lon, providers)
}));

// Minimaler RequestEvent-Mock: `+server.ts` nutzt nur `url`, `fetch` und `getClientAddress`.
const buildEvent = (search: string): RequestEvent =>
	({
		url: new URL(`http://localhost/api/geocode${search}`),
		fetch: vi.fn(),
		getClientAddress: () => '192.0.2.1'
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

	it('liefert 429, wenn der Rate-Limiter die IP blockiert', async () => {
		tryConsumeMock.mockResolvedValueOnce(false);
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?lat=50.9&lon=6.9') as never);

		expect(response.status).toBe(429);
		expect(tryConsumeMock).toHaveBeenCalledWith('192.0.2.1');
		expect(reverseGeocodeMock).not.toHaveBeenCalled();
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
