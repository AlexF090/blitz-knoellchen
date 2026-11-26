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

const shouldThrottleMock = vi.fn<(minIntervalMs: number) => boolean>(() => false);
vi.mock('#lib/geocode/rateLimiter.ts', () => ({
	GEOAPIFY_MIN_INTERVAL_MS: 1000,
	shouldThrottle: (minIntervalMs: number) => shouldThrottleMock(minIntervalMs)
}));

const searchMock = vi.fn();
vi.mock('#lib/geocode/autocomplete.ts', () => ({
	createGeoapifyAutocompleteProvider: vi.fn(() => ({ search: searchMock }))
}));

// Minimaler RequestEvent-Mock: `+server.ts` nutzt nur `url`, `fetch` und `getClientAddress`.
const buildEvent = (search: string): RequestEvent =>
	({
		url: new URL(`http://localhost/api/geocode/autocomplete${search}`),
		fetch: vi.fn(),
		getClientAddress: () => '192.0.2.1'
	}) as unknown as RequestEvent;

describe('GET /api/geocode/autocomplete', () => {
	it('liefert eine leere Liste ohne Provider-Aufruf bei zu kurzer Query', async () => {
		const { GET } = await import('./+server');
		const response = await GET(buildEvent('?q=Do') as never);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ suggestions: [] });
		expect(searchMock).not.toHaveBeenCalled();
	});

	it('liefert eine leere Liste ohne Provider-Aufruf, wenn q fehlt', async () => {
		const { GET } = await import('./+server');
		const response = await GET(buildEvent('') as never);

		await expect(response.json()).resolves.toEqual({ suggestions: [] });
	});

	it('liefert eine leere Liste, wenn der Rate-Limiter die IP blockiert', async () => {
		tryConsumeMock.mockResolvedValueOnce(false);
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?q=Domklo') as never);

		await expect(response.json()).resolves.toEqual({ suggestions: [] });
		expect(tryConsumeMock).toHaveBeenCalledWith('192.0.2.1');
		expect(searchMock).not.toHaveBeenCalled();
	});

	it('liefert eine leere Liste, wenn gedrosselt wird', async () => {
		shouldThrottleMock.mockReturnValueOnce(true);
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?q=Domklo') as never);

		await expect(response.json()).resolves.toEqual({ suggestions: [] });
		expect(searchMock).not.toHaveBeenCalled();
	});

	it('liefert die Vorschläge des Providers', async () => {
		const suggestions = [
			{
				label: 'Domkloster 4, 50667 Köln',
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			}
		];
		searchMock.mockResolvedValueOnce(suggestions);
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?q=Domklo') as never);

		expect(searchMock).toHaveBeenCalledWith('Domklo');
		await expect(response.json()).resolves.toEqual({ suggestions });
	});

	it('fängt Fehler des Providers ab, loggt und liefert eine leere Liste', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		searchMock.mockRejectedValueOnce(new Error('Geoapify down'));
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?q=Domklo') as never);

		await expect(response.json()).resolves.toEqual({ suggestions: [] });
		expect(errorSpy).toHaveBeenCalledWith('[autocomplete] fehlgeschlagen:', expect.any(Error));
	});
});
