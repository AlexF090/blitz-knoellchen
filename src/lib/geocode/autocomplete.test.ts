import { describe, expect, it, vi } from 'vitest';
import { createGeoapifyAutocompleteProvider } from './autocomplete';

const respondWith = (results: unknown) =>
	vi.fn(async () => new Response(JSON.stringify({ results }))) as unknown as typeof fetch;

describe('createGeoapifyAutocompleteProvider', () => {
	it('liefert eine leere Liste ohne Fetch-Call bei zu kurzer Query', async () => {
		const fetchFn = vi.fn() as unknown as typeof fetch;
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Do')).resolves.toEqual([]);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('liefert eine leere Liste ohne Fetch-Call bei leerer Query', async () => {
		const fetchFn = vi.fn() as unknown as typeof fetch;
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('   ')).resolves.toEqual([]);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('fragt den EU-Endpunkt an und begrenzt die Suche per Rechteck auf Köln', async () => {
		const fetchFn = respondWith([]);
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await provider.search('Domklo');

		const url = new URL(String(vi.mocked(fetchFn).mock.calls[0][0]));
		expect(url.host).toBe('api-eu.geoapify.com');
		expect(url.searchParams.get('text')).toBe('Domklo');
		expect(url.searchParams.get('filter')).toMatch(/^rect:[\d.]+,[\d.]+,[\d.]+,[\d.]+$/);
		expect(url.searchParams.get('lang')).toBe('de');
		expect(url.searchParams.get('apiKey')).toBe('test-key');
	});

	it('sendet ein Timeout-Signal und mappt Vorschläge inkl. label', async () => {
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response(
				JSON.stringify({
					results: [
						{
							formatted: 'Domkloster 4, 50667 Köln, Deutschland',
							street: 'Domkloster',
							housenumber: '4',
							postcode: '50667',
							city: 'Köln'
						}
					]
				})
			);
		}) as unknown as typeof fetch;
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Domklo')).resolves.toEqual([
			{
				label: 'Domkloster 4, 50667 Köln',
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			}
		]);
	});

	it('hängt den Stadtteil mit Bindestrich an die Stadt an, wenn vorhanden', async () => {
		const provider = createGeoapifyAutocompleteProvider(
			'test-key',
			respondWith([
				{
					formatted: 'Schwester-Firma-Weg 24, 51143 Köln, Deutschland',
					street: 'Schwester-Firma-Weg',
					housenumber: '24',
					postcode: '51143',
					city: 'Köln',
					suburb: 'Zündorf'
				}
			])
		);

		const [suggestion] = await provider.search('Schwester-Firma-Weg 24');
		expect(suggestion.label).toBe('Schwester-Firma-Weg 24, 51143 Köln-Zündorf');
	});

	it('fällt auf formatted zurück, wenn kein Straßenname vorliegt', async () => {
		const provider = createGeoapifyAutocompleteProvider(
			'test-key',
			respondWith([{ formatted: 'Zündorf, Köln, Deutschland', city: 'Köln', suburb: 'Zündorf' }])
		);

		const [suggestion] = await provider.search('Zündorf');
		expect(suggestion.label).toBe('Zündorf, Köln, Deutschland');
	});

	it('wirft bei HTTP-Fehler eine aussagekräftige Fehlermeldung', async () => {
		const fetchFn = vi.fn(
			async () => new Response(null, { status: 429 })
		) as unknown as typeof fetch;
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Domklo')).rejects.toThrow(/Rate-Limiting.*429/);
	});

	it('baut das Label ohne Hausnummer/PLZ/Ort/Stadtteil, wenn nur die Straße bekannt ist', async () => {
		const provider = createGeoapifyAutocompleteProvider(
			'test-key',
			respondWith([{ formatted: 'Domkloster, Köln', street: 'Domkloster' }])
		);

		const [suggestion] = await provider.search('Domklo');
		expect(suggestion).toEqual({
			label: 'Domkloster',
			street: 'Domkloster',
			houseNumber: null,
			postcode: null,
			city: null
		});
	});

	it('fällt auf einen leeren String zurück, wenn weder Straße noch formatted vorliegen', async () => {
		const provider = createGeoapifyAutocompleteProvider('test-key', respondWith([{}]));

		const [suggestion] = await provider.search('Domklo');
		expect(suggestion.label).toBe('');
	});

	it('liefert eine leere Liste, wenn die Antwort kein results-Array enthält', async () => {
		const fetchFn = vi.fn(
			async () => new Response(JSON.stringify({ error: 'unexpected' }))
		) as unknown as typeof fetch;
		const provider = createGeoapifyAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Domklo')).resolves.toEqual([]);
	});
});
