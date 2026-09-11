import { describe, expect, it } from 'vitest';
import { applyAddressSuggestion, type LocationAddressFields } from './applyAddressSuggestion';

const emptyTarget = (): LocationAddressFields => ({
	locationStreet: '',
	locationHouseNumber: '',
	locationPostcode: '',
	locationCity: ''
});

describe('applyAddressSuggestion', () => {
	it('overwrite=true ersetzt auch bereits vorhandene Werte', () => {
		const target: LocationAddressFields = {
			locationStreet: 'Alte Straße 1',
			locationHouseNumber: '1',
			locationPostcode: '50000',
			locationCity: 'Alt-Stadt'
		};

		applyAddressSuggestion(
			target,
			{ street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' },
			true
		);

		expect(target).toEqual({
			locationStreet: 'Domkloster',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Köln'
		});
	});

	it('overwrite=false füllt nur leere Felder', () => {
		const target: LocationAddressFields = {
			locationStreet: 'Manuell eingetragene Straße',
			locationHouseNumber: '',
			locationPostcode: '',
			locationCity: 'Manuell eingetragener Ort'
		};

		applyAddressSuggestion(
			target,
			{ street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' },
			false
		);

		expect(target).toEqual({
			locationStreet: 'Manuell eingetragene Straße',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Manuell eingetragener Ort'
		});
	});

	it('ignoriert null/undefined-Felder in der Adresse', () => {
		const target = emptyTarget();

		applyAddressSuggestion(target, { street: null, houseNumber: undefined }, true);

		expect(target).toEqual(emptyTarget());
	});
});
