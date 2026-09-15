import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from './$types';

vi.mock('$env/static/private', () => ({ LOCATIONIQ_API_KEY: 'test-key' }));

const shouldThrottleMock = vi.fn<(minIntervalMs: number) => boolean>(() => false);
vi.mock('$lib/geocode/rateLimiter', () => ({
	LOCATIONIQ_MIN_INTERVAL_MS: 1000,
	shouldThrottle: (minIntervalMs: number) => shouldThrottleMock(minIntervalMs)
}));

const searchMock = vi.fn();
vi.mock('$lib/geocode/autocomplete', () => ({
	createLocationIqAutocompleteProvider: vi.fn(() => ({ search: searchMock }))
}));

// Minimaler RequestEvent-Mock: `+server.ts` nutzt nur `url` und `fetch` aus dem Event.
const buildEvent = (search: string): RequestEvent =>
	({
		url: new URL(`http://localhost/api/geocode/autocomplete${search}`),
		fetch: vi.fn()
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
		searchMock.mockRejectedValueOnce(new Error('LocationIQ down'));
		const { GET } = await import('./+server');

		const response = await GET(buildEvent('?q=Domklo') as never);

		await expect(response.json()).resolves.toEqual({ suggestions: [] });
		expect(errorSpy).toHaveBeenCalledWith('[autocomplete] fehlgeschlagen:', expect.any(Error));
	});
});
