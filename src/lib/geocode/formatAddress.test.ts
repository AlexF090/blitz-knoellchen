import { describe, expect, it } from 'vitest';
import { formatAddress } from './formatAddress';

describe('formatAddress', () => {
	it('fügt die Hausnummer an, wenn vorhanden', () => {
		expect(
			formatAddress({
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			})
		).toBe('Domkloster 4, 50667 Köln');
	});

	it('lässt die Hausnummer weg, wenn sie fehlt', () => {
		expect(
			formatAddress({
				street: 'Domkloster',
				postcode: '50667',
				city: 'Köln'
			})
		).toBe('Domkloster, 50667 Köln');
	});

	it('lässt die Hausnummer weg, wenn sie nur Leerraum enthält', () => {
		expect(
			formatAddress({
				street: 'Domkloster',
				houseNumber: '   ',
				postcode: '50667',
				city: 'Köln'
			})
		).toBe('Domkloster, 50667 Köln');
	});

	it('trimmt die Hausnummer', () => {
		expect(
			formatAddress({
				street: 'Domkloster',
				houseNumber: ' 4 ',
				postcode: '50667',
				city: 'Köln'
			})
		).toBe('Domkloster 4, 50667 Köln');
	});
});
