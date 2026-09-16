import { describe, expect, it, vi } from 'vitest';
import type { GeocodeAddress } from './geocodeAddress';
import {
	createBigDataCloudProvider,
	createLocationIqProvider,
	reverseGeocode,
	type GeocodeProvider
} from './reverseGeocode';

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
		const locationIq = provider('locationIq', async () => DOMKLOSTER);
		const bigdatacloud = provider('bigdatacloud', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [locationIq, bigdatacloud]);

		expect(result.address).toEqual(DOMKLOSTER);
		expect(result.error).toBeNull();
		expect(bigdatacloud.lookup).not.toHaveBeenCalled();
	});

	it('fällt auf den zweiten Provider zurück, wenn der erste fehlschlägt', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const locationIq = provider('locationIq', async () => {
			throw new Error('rate limited');
		});
		const bigdatacloud = provider('bigdatacloud', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [locationIq, bigdatacloud]);

		expect(result.address).toEqual(FALLBACK_ADDRESS);
		expect(result.error).toBeNull();
	});

	it('fällt auf den zweiten Provider zurück, wenn der erste null liefert (ohne zu werfen)', async () => {
		const locationIq = provider('locationIq', async () => null);
		const bigdatacloud = provider('bigdatacloud', async () => FALLBACK_ADDRESS);

		const result = await reverseGeocode(50.9, 6.9, [locationIq, bigdatacloud]);

		expect(result.address).toEqual(FALLBACK_ADDRESS);
	});

	it('liefert einen Fehler, wenn alle Provider fehlschlagen', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const locationIq = provider('locationIq', async () => {
			throw new Error('down');
		});
		const bigdatacloud = provider('bigdatacloud', async () => {
			throw new Error('down');
		});

		const result = await reverseGeocode(50.9, 6.9, [locationIq, bigdatacloud]);

		expect(result.address).toBeNull();
		expect(result.error).toContain('manuell eintragen');
	});
});

describe('createLocationIqProvider', () => {
	it('meldet Rate-Limiting mit einer aussagekräftigen Fehlermeldung', async () => {
		const fetchFn = vi.fn(
			async () => new Response(null, { status: 429 })
		) as unknown as typeof fetch;
		const locationIq = createLocationIqProvider('test-key', fetchFn);

		await expect(locationIq.lookup(50.9, 6.9)).rejects.toThrow(/Rate-Limiting.*429/);
	});

	it('sendet ein Timeout-Signal und liefert Straße/Hausnummer/PLZ/Ort aus address', async () => {
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response(
				JSON.stringify({
					address: {
						road: 'Domkloster',
						house_number: '4',
						postcode: '50667',
						city: 'Köln'
					}
				})
			);
		}) as unknown as typeof fetch;
		const locationIq = createLocationIqProvider('test-key', fetchFn);

		await expect(locationIq.lookup(50.9, 6.9)).resolves.toEqual(DOMKLOSTER);
	});

	it('liefert null, wenn weder Straße noch Ort vorhanden sind', async () => {
		const fetchFn = vi.fn(
			async () => new Response(JSON.stringify({ address: {} }))
		) as unknown as typeof fetch;
		const locationIq = createLocationIqProvider('test-key', fetchFn);

		await expect(locationIq.lookup(50.9, 6.9)).resolves.toBeNull();
	});
});

describe('createBigDataCloudProvider', () => {
	it('meldet eine Blockierung mit einer aussagekräftigen Fehlermeldung', async () => {
		const fetchFn = vi.fn(
			async () => new Response(null, { status: 403 })
		) as unknown as typeof fetch;
		const bigdatacloud = createBigDataCloudProvider(fetchFn);

		await expect(bigdatacloud.lookup(50.9, 6.9)).rejects.toThrow(/blockiert.*403/);
	});

	it('liefert null für postcode und city, wenn keine der Angaben vorhanden ist', async () => {
		const fetchFn = vi.fn(async () => new Response(JSON.stringify({}))) as unknown as typeof fetch;
		const bigdatacloud = createBigDataCloudProvider(fetchFn);

		await expect(bigdatacloud.lookup(50.9, 6.9)).resolves.toBeNull();
	});

	it('fällt auf locality zurück, wenn city fehlt', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						locality: 'Altstadt',
						postcode: '50667'
					})
				)
		) as unknown as typeof fetch;
		const bigdatacloud = createBigDataCloudProvider(fetchFn);

		await expect(bigdatacloud.lookup(50.9, 6.9)).resolves.toEqual({
			street: null,
			houseNumber: null,
			postcode: '50667',
			city: 'Altstadt'
		});
	});

	it('sendet ein Timeout-Signal und liefert nur Ort/PLZ (keine Straße)', async () => {
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response(
				JSON.stringify({
					locality: 'Altstadt',
					city: 'Köln',
					postcode: '50667',
					countryName: 'Deutschland'
				})
			);
		}) as unknown as typeof fetch;
		const bigdatacloud = createBigDataCloudProvider(fetchFn);

		await expect(bigdatacloud.lookup(50.9, 6.9)).resolves.toEqual({
			street: null,
			houseNumber: null,
			postcode: '50667',
			city: 'Köln'
		});
	});
});
