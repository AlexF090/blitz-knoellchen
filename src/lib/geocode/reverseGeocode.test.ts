import { describe, expect, it, vi } from 'vitest';
import { reverseGeocode, type GeocodeProvider } from './reverseGeocode';

function provider(name: string, impl: () => Promise<string | null>): GeocodeProvider {
	return { name, lookup: vi.fn(impl) };
}

describe('reverseGeocode', () => {
	it('nutzt das Ergebnis des ersten erfolgreichen Providers', async () => {
		const nominatim = provider('nominatim', async () => 'Domkloster 4, Köln');
		const bigdatacloud = provider('bigdatacloud', async () => 'Fallback-Adresse');

		const result = await reverseGeocode(50.9, 6.9, [nominatim, bigdatacloud]);

		expect(result.address).toBe('Domkloster 4, Köln');
		expect(result.error).toBeNull();
		expect(bigdatacloud.lookup).not.toHaveBeenCalled();
	});

	it('fällt auf den zweiten Provider zurück, wenn der erste fehlschlägt', async () => {
		const nominatim = provider('nominatim', async () => {
			throw new Error('rate limited');
		});
		const bigdatacloud = provider('bigdatacloud', async () => 'Fallback-Adresse');

		const result = await reverseGeocode(50.9, 6.9, [nominatim, bigdatacloud]);

		expect(result.address).toBe('Fallback-Adresse');
		expect(result.error).toBeNull();
	});

	it('liefert einen Fehler, wenn alle Provider fehlschlagen', async () => {
		const nominatim = provider('nominatim', async () => {
			throw new Error('down');
		});
		const bigdatacloud = provider('bigdatacloud', async () => {
			throw new Error('down');
		});

		const result = await reverseGeocode(50.9, 6.9, [nominatim, bigdatacloud]);

		expect(result.address).toBeNull();
		expect(result.error).toContain('manuell eintragen');
	});
});
