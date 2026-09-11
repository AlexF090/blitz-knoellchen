import { describe, expect, it } from 'vitest';
import {
	HOUSE_NUMBER_SUFFIX_PATTERN,
	isFormValid,
	normalizeLicensePlate,
	validateProfileFields,
	validateReportForm,
	validateVehicle,
	type PhotoEntry,
	type ProfileFields,
	type ReportFormData,
	type VehicleEntry
} from './formSchema';

const makePhoto = (): PhotoEntry => ({
	id: crypto.randomUUID(),
	blob: new Blob(['x'], { type: 'image/jpeg' }),
	fileName: 'beweisfoto.jpg',
	gps: null,
	date: null,
	time: null
});

const makeVehicle = (overrides: Partial<VehicleEntry> = {}, photoIds: string[]): VehicleEntry => ({
	id: crypto.randomUUID(),
	photoIds,
	licensePlate: 'K-AB 1234',
	make: 'Unbekannt',
	color: 'Rot',
	incidentTypeIds: ['gehweg'],
	notes: '',
	date: '2026-03-01',
	time: '14:30',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const makeValidData = (): ReportFormData => {
	const photo = makePhoto();
	return {
		firstName: 'Max',
		lastName: 'Mustermann',
		addressStreet: 'Musterstraße 1',
		addressPostcode: '50667',
		addressCity: 'Köln',
		email: 'max@example.com',
		photos: [photo],
		vehicles: [makeVehicle({}, [photo.id])]
	};
};

describe('validateReportForm', () => {
	it('akzeptiert gültige Eingaben', () => {
		const errors = validateReportForm(makeValidData());
		expect(isFormValid(errors)).toBe(true);
	});

	it('akzeptiert mehrere ausgewählte Verstoßarten', () => {
		const data = makeValidData();
		data.vehicles[0].incidentTypeIds = ['gehweg', 'halteverbot'];
		const errors = validateReportForm(data);
		expect(isFormValid(errors)).toBe(true);
	});

	it('meldet fehlende Pflichtfelder', () => {
		const data = makeValidData();
		data.vehicles[0].locationStreet = '';
		data.vehicles[0].locationPostcode = '';
		data.vehicles[0].locationCity = '';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].locationStreet).toBeDefined();
		expect(errors.vehicles?.[0].locationPostcode).toBeDefined();
		expect(errors.vehicles?.[0].locationCity).toBeDefined();
		expect(isFormValid(errors)).toBe(false);
	});

	it('meldet ungültige E-Mail-Adresse', () => {
		const errors = validateReportForm({ ...makeValidData(), email: 'keine-email' });
		expect(errors.email).toBeDefined();
	});

	it('meldet fehlendes Foto im Pool', () => {
		const data = makeValidData();
		const errors = validateReportForm({ ...data, photos: [] });
		expect(errors.photos).toBeDefined();
		expect(isFormValid(errors)).toBe(false);
	});

	it('akzeptiert bis zu drei Fotos im Pool', () => {
		const photos = [makePhoto(), makePhoto(), makePhoto()];
		const data = makeValidData();
		const errors = validateReportForm({
			...data,
			photos,
			vehicles: [makeVehicle({}, [photos[0].id])]
		});
		expect(isFormValid(errors)).toBe(true);
	});

	it('meldet mehr als drei Fotos im Pool bei nur einem Fahrzeug', () => {
		const data = makeValidData();
		const errors = validateReportForm({
			...data,
			photos: [makePhoto(), makePhoto(), makePhoto(), makePhoto()]
		});
		expect(errors.photos).toBeDefined();
	});

	it('erlaubt mehr als drei Fotos im Pool, wenn mehrere Fahrzeuge das rechtfertigen', () => {
		const photos = [makePhoto(), makePhoto(), makePhoto(), makePhoto()];
		const data = makeValidData();
		const errors = validateReportForm({
			...data,
			photos,
			vehicles: [
				makeVehicle({ licensePlate: 'K-AA 1' }, [photos[0].id, photos[1].id]),
				makeVehicle({ licensePlate: 'K-BB 2' }, [photos[2].id, photos[3].id])
			]
		});
		expect(isFormValid(errors)).toBe(true);
	});

	it('meldet mehr als drei Fotos für ein einzelnes Fahrzeug', () => {
		const photos = [makePhoto(), makePhoto(), makePhoto(), makePhoto()];
		const data = makeValidData();
		const errors = validateReportForm({
			...data,
			photos,
			vehicles: [
				makeVehicle(
					{},
					photos.map((p) => p.id)
				)
			]
		});
		expect(errors.vehicles?.[0].photoIds).toBeDefined();
	});

	it('meldet fehlendes Kennzeichen pro Fahrzeug', () => {
		const data = makeValidData();
		data.vehicles[0].licensePlate = '';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].licensePlate).toBeDefined();
		expect(isFormValid(errors)).toBe(false);
	});

	it('meldet fehlende Verstoßart pro Fahrzeug', () => {
		const data = makeValidData();
		data.vehicles[0].incidentTypeIds = [];
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].incidentTypeIds).toBeDefined();
	});

	it('meldet fehlende Foto-Zuordnung pro Fahrzeug', () => {
		const data = makeValidData();
		data.vehicles[0].photoIds = [];
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].photoIds).toBeDefined();
	});

	it('meldet ungültige Foto-Zuordnung pro Fahrzeug', () => {
		const data = makeValidData();
		data.vehicles[0].photoIds = ['unbekannte-id'];
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].photoIds).toBeDefined();
	});

	it('erlaubt dasselbe Foto für mehrere Fahrzeuge (zwei Kennzeichen auf einem Foto)', () => {
		const photo = makePhoto();
		const data: ReportFormData = {
			...makeValidData(),
			photos: [photo],
			vehicles: [
				makeVehicle({ licensePlate: 'K-AA 1' }, [photo.id]),
				makeVehicle({ licensePlate: 'K-BB 2' }, [photo.id])
			]
		};
		const errors = validateReportForm(data);
		expect(isFormValid(errors)).toBe(true);
	});

	it('validiert jedes Fahrzeug unabhängig (Index-parallel zu vehicles)', () => {
		const data = makeValidData();
		data.vehicles.push(makeVehicle({ licensePlate: '' }, data.vehicles[0].photoIds));
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].licensePlate).toBeUndefined();
		expect(errors.vehicles?.[1].licensePlate).toBeDefined();
	});

	it('meldet ungültiges Kennzeichenformat', () => {
		const data = makeValidData();
		data.vehicles[0].licensePlate = 'nur text';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].licensePlate).toBeDefined();
	});

	it.each(['K-AB 1234', 'K AB 1234', 'KAB1234', 'M-XY 1', 'K-E 123E', 'HH-AB 12H'])(
		'akzeptiert gültiges Kennzeichenformat "%s"',
		(licensePlate) => {
			const data = makeValidData();
			data.vehicles[0].licensePlate = licensePlate;
			const errors = validateReportForm(data);
			expect(errors.vehicles?.[0].licensePlate).toBeUndefined();
		}
	);

	it('meldet ungültige Postleitzahl', () => {
		const data = makeValidData();
		data.vehicles[0].locationPostcode = 'abcde';
		const errors = validateReportForm({
			...data,
			addressPostcode: '123'
		});
		expect(errors.addressPostcode).toBeDefined();
		expect(errors.vehicles?.[0].locationPostcode).toBeDefined();
	});

	it('meldet ungültiges Datum', () => {
		const data = makeValidData();
		data.vehicles[0].date = '2026-02-30';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].date).toBeDefined();
	});

	it('meldet Datum in der Zukunft', () => {
		const data = makeValidData();
		data.vehicles[0].date = '2999-01-01';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].date).toBeDefined();
	});

	it('meldet ungültige Uhrzeit', () => {
		const data = makeValidData();
		data.vehicles[0].time = '25:99';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].time).toBeDefined();
	});

	it('meldet fehlende Marke', () => {
		const data = makeValidData();
		data.vehicles[0].make = '';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].make).toBeDefined();
	});

	it('akzeptiert "Unbekannt" als Marke', () => {
		const data = makeValidData();
		data.vehicles[0].make = 'Unbekannt';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].make).toBeUndefined();
	});

	it('meldet fehlende Farbe', () => {
		const data = makeValidData();
		data.vehicles[0].color = '';
		const errors = validateReportForm(data);
		expect(errors.vehicles?.[0].color).toBeDefined();
	});
});

describe('validateVehicle: timeMode', () => {
	it('Halteverstoß ist auch ohne endTime gültig', () => {
		const vehicle = makeVehicle({ timeMode: 'halteverstoss' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeUndefined();
	});

	it('Parkverstoß ohne endTime meldet einen Fehler', () => {
		const vehicle = makeVehicle({ timeMode: 'parkverstoss' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeDefined();
	});

	it('Parkverstoß mit Zeitraum >= 4 Minuten ist gültig', () => {
		const vehicle = makeVehicle({ timeMode: 'parkverstoss', time: '14:00', endTime: '14:04' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeUndefined();
	});

	it('Parkverstoß mit Zeitraum < 4 Minuten meldet einen Fehler', () => {
		const vehicle = makeVehicle({ timeMode: 'parkverstoss', time: '14:00', endTime: '14:03' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeDefined();
	});

	it('Bis-Uhrzeit vor oder gleich Von-Uhrzeit meldet einen Fehler', () => {
		const vehicle = makeVehicle({ timeMode: 'parkverstoss', time: '14:00', endTime: '14:00' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeDefined();
	});

	it('ungültiges Bis-Format meldet einen Fehler', () => {
		const vehicle = makeVehicle({ timeMode: 'parkverstoss', time: '14:00', endTime: '99:99' }, []);
		const errors = validateVehicle(vehicle, []);
		expect(errors.endTime).toBeDefined();
	});
});

describe('normalizeLicensePlate', () => {
	it.each([
		['K-AB 1234', 'K-AB1234'],
		['K AB 1234', 'K-AB1234'],
		['KAB1234', 'K-AB1234'],
		['k-ab 1234', 'K-AB1234'],
		['H-VA1234', 'H-VA1234'],
		['HH-AB 12H', 'HH-AB12H']
	])('normalisiert "%s" zu "%s"', (input, expected) => {
		expect(normalizeLicensePlate(input)).toBe(expected);
	});

	it('gibt nicht-parsbare Eingaben getrimmt unverändert zurück', () => {
		expect(normalizeLicensePlate('  nur text  ')).toBe('nur text');
	});
});

describe('validateProfileFields', () => {
	const makeValidProfile = (): ProfileFields => ({
		firstName: 'Max',
		lastName: 'Mustermann',
		addressStreet: 'Musterstraße 12',
		addressPostcode: '50667',
		addressCity: 'Köln',
		email: 'max@example.com'
	});

	it('akzeptiert vollständig ausgefüllte Profildaten', () => {
		expect(validateProfileFields(makeValidProfile())).toEqual({});
	});

	it('meldet fehlende Profil-Pflichtfelder, ohne Tatort-/Fahrzeugfelder zu prüfen', () => {
		const errors = validateProfileFields({ ...makeValidProfile(), firstName: '', email: '' });
		expect(errors.firstName).toBeDefined();
		expect(errors.email).toBeDefined();
		expect(Object.keys(errors)).toEqual(['firstName', 'email']);
	});

	it('meldet ungültige Postleitzahl im Profil', () => {
		const errors = validateProfileFields({ ...makeValidProfile(), addressPostcode: '123' });
		expect(errors.addressPostcode).toBeDefined();
	});

	it('meldet eine Straße ohne Hausnummer als ungültig', () => {
		const errors = validateProfileFields({ ...makeValidProfile(), addressStreet: 'Musterstraße' });
		expect(errors.addressStreet).toBeDefined();
	});

	it.each(['Musterstraße 12', 'Musterstraße 12a'])(
		'akzeptiert gültige Straße-mit-Hausnummer "%s"',
		(addressStreet) => {
			const errors = validateProfileFields({ ...makeValidProfile(), addressStreet });
			expect(errors.addressStreet).toBeUndefined();
		}
	);

	it.each(['Musterstraße', ''])(
		'lehnt ungültige Straße-ohne-Hausnummer "%s" ab',
		(addressStreet) => {
			expect(HOUSE_NUMBER_SUFFIX_PATTERN.test(addressStreet)).toBe(false);
		}
	);
});
