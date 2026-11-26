import { describe, expect, it, vi } from 'vitest';
import type { GeocodeAddress } from './geocodeAddress';
import { createGeoapifyProvider, reverseGeocode, type GeocodeProvider } from './reverseGeocode';

const provider = (name: string, impl: () => Promise<GeocodeAddress | null>): GeocodeProvider => {
	return { name, lookup: vi.fn(impl) };
};

const DOMKLOSTER: GeocodeAddress = {
	street: 'Domkloster',
	houseNumber: '4',
	postcode: '50667',
	city: 'Köln'
};

const FALLBACK_ADDRESS: GeocodeAddress = {
	street: null,
	houseNumber: null,
	postcode: null,
	city: 'Fallback-Ort'
};

describe('reverseGeocode', () => {
	it('nutzt das Ergebnis des ersten erfolgreichen Providers', async () => {
		const firstProvider = provider('erster', async () => DOMKLOSTER);
		const secondProvider = provider('zweiter', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [firstProvider, secondProvider]);

		expect(result.address).toEqual(DOMKLOSTER);
		expect(result.error).toBeNull();
		expect(secondProvider.lookup).not.toHaveBeenCalled();
	});

	it('fällt auf den zweiten Provider zurück, wenn der erste fehlschlägt', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const firstProvider = provider('erster', async () => {
			throw new Error('rate limited');
		});
		const secondProvider = provider('zweiter', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [firstProvider, secondProvider]);

		expect(result.address).toEqual(FALLBACK_ADDRESS);
		expect(result.error).toBeNull();
	});

	it('fällt auf den zweiten Provider zurück, wenn der erste null liefert (ohne zu werfen)', async () => {
		const firstProvider = provider('erster', async () => null);
		const secondProvider = provider('zweiter', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [firstProvider, secondProvider]);

		expect(result.address).toEqual(FALLBACK_ADDRESS);
	});

	it('liefert einen Fehler, wenn alle Provider fehlschlagen', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const firstProvider = provider('erster', async () => {
			throw new Error('down');
		});
		const secondProvider = provider('zweiter', async () => {
			throw new Error('down');
		});

		const result = await reverseGeocode(50.9, 6.9, [firstProvider, secondProvider]);

		expect(result.address).toBeNull();
		expect(result.error).toContain('manuell eintragen');
	});
});

describe('createGeoapifyProvider', () => {
	const respondWith = (body: unknown) =>
		vi.fn(async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;

	it('meldet Rate-Limiting mit einer aussagekräftigen Fehlermeldung', async () => {
		const fetchFn = vi.fn(
			async () => new Response(null, { status: 429 })
		) as unknown as typeof fetch;

		await expect(createGeoapifyProvider('test-key', fetchFn).lookup(50.9, 6.9)).rejects.toThrow(
			/Rate-Limiting.*429/
		);
	});

	it('fragt den EU-Endpunkt mit deutscher Sprache und Schlüssel an', async () => {
		const fetchFn = respondWith({ results: [{ city: 'Köln' }] });

		await createGeoapifyProvider('test-key', fetchFn).lookup(50.9, 6.9);

		const url = new URL(String(vi.mocked(fetchFn).mock.calls[0][0]));
		expect(url.host).toBe('api-eu.geoapify.com');
		expect(url.searchParams.get('lang')).toBe('de');
		expect(url.searchParams.get('apiKey')).toBe('test-key');
	});

	it('sendet ein Timeout-Signal und liefert Straße/Hausnummer/PLZ/Ort des ersten Treffers', async () => {
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response(
				JSON.stringify({
					results: [
						{ street: 'Domkloster', housenumber: '4', postcode: '50667', city: 'Köln' },
						{ street: 'Andere Straße', city: 'Köln' }
					]
				})
			);
		}) as unknown as typeof fetch;

		await expect(createGeoapifyProvider('test-key', fetchFn).lookup(50.9, 6.9)).resolves.toEqual(
			DOMKLOSTER
		);
	});

	it('liefert null, wenn weder Straße noch Ort vorhanden sind', async () => {
		await expect(
			createGeoapifyProvider('test-key', respondWith({ results: [{ postcode: '50667' }] })).lookup(
				50.9,
				6.9
			)
		).resolves.toBeNull();
	});

	it.each([
		['ohne Treffer', { results: [] }],
		['ohne results-Feld', {}]
	])('liefert null %s', async (_description, body) => {
		await expect(
			createGeoapifyProvider('test-key', respondWith(body)).lookup(50.9, 6.9)
		).resolves.toBeNull();
	});
});
