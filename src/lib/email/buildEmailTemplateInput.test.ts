import type { IncidentType } from '$lib/config/cities';
import type { ProfileFields, VehicleEntry } from '$lib/validation/formSchema';
import { describe, expect, it } from 'vitest';
import { buildEmailTemplateInput, resolveVehicleIncidentTypes } from './buildEmailTemplateInput';

const profile: ProfileFields = {
	firstName: 'Max',
	lastName: 'Mustermann',
	addressStreet: 'Musterstraße 1',
	addressPostcode: '50667',
	addressCity: 'Köln',
	email: 'max@example.com',
	phone: '0221 12345678'
};

const vehicle: VehicleEntry = {
	id: 'vehicle-1',
	photoIds: ['photo-1'],
	licensePlate: 'K-AB 1234',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'VW',
	color: 'Rot',
	incidentTypeIds: ['gehweg'],
	notes: 'Fahrzeug stand seit über einer Stunde dort.',
	date: '2026-03-01',
	time: '14:30',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln'
};

const incidentTypes: IncidentType[] = [
	{
		id: 'gehweg',
		label: 'Parken auf dem Gehweg',
		description: 'Das Fahrzeug parkte auf dem Gehweg.'
	},
	{
		id: 'halteverbot',
		label: 'Parken im Halteverbot',
		description: 'Das Fahrzeug parkte im Halteverbot.'
	}
];

describe('buildEmailTemplateInput', () => {
	it('mappt Profil- und Fahrzeugdaten in ein EmailTemplateInput', () => {
		const input = buildEmailTemplateInput({
			profile,
			vehicle,
			incidentTypes: [incidentTypes[0]],
			photoCount: 1,
			vehicleIndex: 1,
			vehicleTotal: 1
		});

		expect(input).toMatchObject({
			firstName: 'Max',
			lastName: 'Mustermann',
			addressStreet: 'Musterstraße 1',
			addressPostcode: '50667',
			addressCity: 'Köln',
			phone: '0221 12345678',
			date: '2026-03-01',
			time: '14:30',
			locationStreet: 'Domkloster',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Köln',
			licensePlate: 'K-AB 1234',
			licensePlateCountry: 'D',
			vehicleType: 'PKW',
			make: 'VW',
			color: 'Rot',
			notes: 'Fahrzeug stand seit über einer Stunde dort.',
			photoCount: 1,
			vehicleIndex: 1,
			vehicleTotal: 1
		});
		expect(input.incidentTypes).toEqual([
			{ label: 'Parken auf dem Gehweg', description: 'Das Fahrzeug parkte auf dem Gehweg.' }
		]);
	});

	it('reicht vehicleIndex/vehicleTotal für mehrere Fahrzeuge durch', () => {
		const input = buildEmailTemplateInput({
			profile,
			vehicle,
			incidentTypes,
			photoCount: 2,
			vehicleIndex: 2,
			vehicleTotal: 3
		});

		expect(input.vehicleIndex).toBe(2);
		expect(input.vehicleTotal).toBe(3);
		expect(input.photoCount).toBe(2);
	});
});

describe('resolveVehicleIncidentTypes', () => {
	it('filtert die Verstoßarten der Stadt auf die am Fahrzeug ausgewählten IDs', () => {
		const result = resolveVehicleIncidentTypes({ incidentTypes }, vehicle);
		expect(result).toEqual([incidentTypes[0]]);
	});

	it('liefert eine leere Liste, wenn keine Verstoßart ausgewählt ist', () => {
		const result = resolveVehicleIncidentTypes(
			{ incidentTypes },
			{ ...vehicle, incidentTypeIds: [] }
		);
		expect(result).toEqual([]);
	});
});
