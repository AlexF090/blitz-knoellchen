import { describe, expect, it } from 'vitest';
import {
	isFormValid,
	validateProfileFields,
	validateReportForm,
	type PhotoEntry,
	type ProfileFields,
	type ReportFormData,
	type VehicleEntry
} from './formSchema';

const makePhoto = (): PhotoEntry => ({
	id: crypto.randomUUID(),
	blob: new Blob(['x'], { type: 'image/jpeg' }),
	fileName: 'beweisfoto.jpg'
});

const makeVehicle = (overrides: Partial<VehicleEntry> = {}, photoIds: string[]): VehicleEntry => ({
	id: crypto.randomUUID(),
	photoIds,
	licensePlate: 'K-AB 1234',
	incidentTypeIds: ['gehweg'],
	notes: '',
	...overrides
});

const makeValidData = (): ReportFormData => {
	const photo = makePhoto();
	return {
		firstName: 'Max',
		lastName: 'Mustermann',
		addressStreet: 'Musterstraße',
		addressHouseNumber: '1',
		addressPostcode: '50667',
		addressCity: 'Köln',
		email: 'max@example.com',
		date: '2026-03-01',
		time: '14:30',
		locationStreet: 'Domkloster',
		locationHouseNumber: '4',
		locationPostcode: '50667',
		locationCity: 'Köln',
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
		const errors = validateReportForm({
			...data,
			locationStreet: '',
			locationPostcode: '',
			locationCity: ''
		});
		expect(errors.locationStreet).toBeDefined();
		expect(errors.locationPostcode).toBeDefined();
		expect(errors.locationCity).toBeDefined();
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
		const errors = validateReportForm({
			...data,
			addressPostcode: '123',
			locationPostcode: 'abcde'
		});
		expect(errors.addressPostcode).toBeDefined();
		expect(errors.locationPostcode).toBeDefined();
	});

	it('meldet ungültiges Datum', () => {
		const data = makeValidData();
		const errors = validateReportForm({ ...data, date: '2026-02-30' });
		expect(errors.date).toBeDefined();
	});

	it('meldet Datum in der Zukunft', () => {
		const data = makeValidData();
		const errors = validateReportForm({ ...data, date: '2999-01-01' });
		expect(errors.date).toBeDefined();
	});

	it('meldet ungültige Uhrzeit', () => {
		const data = makeValidData();
		const errors = validateReportForm({ ...data, time: '25:99' });
		expect(errors.time).toBeDefined();
	});
});

describe('validateProfileFields', () => {
	const makeValidProfile = (): ProfileFields => ({
		firstName: 'Max',
		lastName: 'Mustermann',
		addressStreet: 'Musterstraße',
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
});
