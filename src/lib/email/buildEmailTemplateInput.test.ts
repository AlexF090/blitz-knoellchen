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
	impairmentIds: [],
	endangeredPersonIds: [],
	endangeredPersonsNote: '',
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

describe('buildEmailTemplateInput Halte-/Parkwortlaut', () => {
	const sidewalk: IncidentType = {
		id: 'gehweg',
		label: 'Halten/Parken auf dem Gehweg',
		emailLabel: '{Vorgang} auf dem Gehweg',
		description: 'Das Fahrzeug {verb} auf dem Gehweg.'
	};
	const build = (timeMode: VehicleEntry['timeMode']) =>
		buildEmailTemplateInput({
			profile,
			vehicle: { ...vehicle, timeMode },
			incidentTypes: [sidewalk],
			photoCount: 1,
			vehicleIndex: 1,
			vehicleTotal: 1
		});

	it('formuliert bei Halteverstoß mit „Halten"/„hielt"', () => {
		expect(build('halteverstoss').incidentTypes).toEqual([
			{ label: 'Halten auf dem Gehweg', description: 'Das Fahrzeug hielt auf dem Gehweg.' }
		]);
	});

	it('formuliert bei Parkverstoß mit „Parken"/„parkte"', () => {
		expect(build('parkverstoss').incidentTypes).toEqual([
			{ label: 'Parken auf dem Gehweg', description: 'Das Fahrzeug parkte auf dem Gehweg.' }
		]);
	});

	it('nutzt das Formular-Label, wenn kein emailLabel gesetzt ist', () => {
		const input = buildEmailTemplateInput({
			profile,
			vehicle,
			incidentTypes: [incidentTypes[1]],
			photoCount: 1,
			vehicleIndex: 1,
			vehicleTotal: 1
		});
		expect(input.incidentTypes[0].label).toBe('Parken im Halteverbot');
	});
});

describe('buildEmailTemplateInput Auswirkungen', () => {
	it('löst Behinderungs- und Personen-ids zu E-Mail-Texten auf', () => {
		const input = buildEmailTemplateInput({
			profile,
			vehicle: {
				...vehicle,
				impairmentIds: ['sicht-verdeckt', 'gehweg-blockiert', 'unbekannt'],
				endangeredPersonIds: ['radfahrende', 'kinder-schulweg'],
				endangeredPersonsNote: 'Schule in der Nähe'
			},
			incidentTypes,
			photoCount: 1,
			vehicleIndex: 1,
			vehicleTotal: 1
		});
		expect(input.impairments).toEqual([
			'Der Gehweg war vollständig blockiert.',
			'Die Sicht an der Kreuzung bzw. am Überweg war verdeckt.'
		]);
		expect(input.endangeredPersons).toEqual(['Kinder auf dem Schulweg', 'Radfahrende']);
		expect(input.endangeredPersonsNote).toBe('Schule in der Nähe');
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
