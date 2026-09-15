import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAddressSuggestions } from './autocompleteClient';

describe('fetchAddressSuggestions', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('liefert die Vorschläge bei erfolgreicher Antwort', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							suggestions: [
								{
									label: 'Domkloster 4, 50667 Köln',
									street: 'Domkloster',
									houseNumber: '4',
									postcode: '50667',
									city: 'Köln'
								}
							]
						})
					)
			)
		);

		await expect(fetchAddressSuggestions('Domklo')).resolves.toEqual([
			{
				label: 'Domkloster 4, 50667 Köln',
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			}
		]);
	});

	it('liefert eine leere Liste, wenn suggestions kein Array ist', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({})))
		);

		await expect(fetchAddressSuggestions('Domklo')).resolves.toEqual([]);
	});

	it('loggt und liefert eine leere Liste bei einer !ok-Antwort', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('Server-Fehler', { status: 502 }))
		);

		await expect(fetchAddressSuggestions('Domklo')).resolves.toEqual([]);
		expect(errorSpy).toHaveBeenCalledWith(
			'fetchAddressSuggestions fehlgeschlagen:',
			502,
			expect.any(String)
		);
	});

	it('loggt und liefert eine leere Liste, wenn fetch wirft', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('Netzwerkfehler');
			})
		);

		await expect(fetchAddressSuggestions('Domklo')).resolves.toEqual([]);
		expect(errorSpy).toHaveBeenCalledWith(
			'fetchAddressSuggestions fehlgeschlagen:',
			expect.any(Error)
		);
	});
});
