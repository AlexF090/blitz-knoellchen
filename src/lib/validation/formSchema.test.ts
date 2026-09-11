import { describe, expect, it } from 'vitest';
import {
	isFormValid,
	validateReportForm,
	type PhotoEntry,
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

	it('meldet mehr als drei Fotos im Pool', () => {
		const data = makeValidData();
		const errors = validateReportForm({
			...data,
			photos: [makePhoto(), makePhoto(), makePhoto(), makePhoto()]
		});
		expect(errors.photos).toBeDefined();
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
});
