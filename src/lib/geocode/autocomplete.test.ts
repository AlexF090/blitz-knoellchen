import { describe, expect, it, vi } from 'vitest';
import { createLocationIqAutocompleteProvider } from './autocomplete';

describe('createLocationIqAutocompleteProvider', () => {
	it('liefert eine leere Liste ohne Fetch-Call bei zu kurzer Query', async () => {
		const fetchFn = vi.fn() as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Do')).resolves.toEqual([]);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('liefert eine leere Liste ohne Fetch-Call bei leerer Query', async () => {
		const fetchFn = vi.fn() as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('   ')).resolves.toEqual([]);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('begrenzt die Suche per viewbox/bounded auf Köln', async () => {
		const fetchFn = vi.fn(async (url) => {
			expect(String(url)).toContain('bounded=1');
			expect(String(url)).toMatch(/viewbox=[\d.,]+/);
			return new Response(JSON.stringify([]));
		}) as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

		await provider.search('Domklo');
		expect(fetchFn).toHaveBeenCalled();
	});

	it('sendet ein Timeout-Signal und mappt Vorschläge inkl. label', async () => {
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response(
				JSON.stringify([
					{
						display_name: 'Domkloster 4, 50667 Köln',
						address: {
							road: 'Domkloster',
							house_number: '4',
							postcode: '50667',
							city: 'Köln'
						}
					}
				])
			);
		}) as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

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

	it('wirft bei HTTP-Fehler eine aussagekräftige Fehlermeldung', async () => {
		const fetchFn = vi.fn(
			async () => new Response(null, { status: 429 })
		) as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Domklo')).rejects.toThrow(/Rate-Limiting.*429/);
	});

	it('liefert eine leere Liste, wenn die Antwort kein Array ist', async () => {
		const fetchFn = vi.fn(
			async () => new Response(JSON.stringify({ error: 'unexpected' }))
		) as unknown as typeof fetch;
		const provider = createLocationIqAutocompleteProvider('test-key', fetchFn);

		await expect(provider.search('Domklo')).resolves.toEqual([]);
	});
});
