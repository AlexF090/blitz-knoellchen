import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAddress } from './client';

describe('fetchAddress', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('liefert die Adresse bei erfolgreicher Antwort', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
						})
					)
			)
		);

		await expect(fetchAddress(50.9, 6.9)).resolves.toEqual({
			street: 'Domkloster',
			houseNumber: '4',
			postcode: '50667',
			city: 'Köln'
		});
	});

	it('liefert null, wenn die Antwort keine address enthält', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({})))
		);

		await expect(fetchAddress(50.9, 6.9)).resolves.toBeNull();
	});

	it('loggt und liefert null bei einer !ok-Antwort', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('Server-Fehler', { status: 502 }))
		);

		await expect(fetchAddress(50.9, 6.9)).resolves.toBeNull();
		expect(errorSpy).toHaveBeenCalledWith('fetchAddress fehlgeschlagen:', 502, expect.any(String));
	});

	it('loggt und liefert null, wenn fetch wirft', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('Netzwerkfehler');
			})
		);

		await expect(fetchAddress(50.9, 6.9)).resolves.toBeNull();
		expect(errorSpy).toHaveBeenCalledWith('fetchAddress fehlgeschlagen:', expect.any(Error));
	});
});
