import { describe, expect, it } from 'vitest';
import { buildVehicleSummaryRows } from './vehicleSummary';
import type { IncidentType } from '$lib/config/cities';
import type { VehicleEntry } from '$lib/validation/formSchema';

const incidentTypes: IncidentType[] = [
	{ id: 'gehweg', label: 'Parken auf dem Gehweg', description: 'x' },
	{ id: 'halteverbot', label: 'Parken im Halteverbot', description: 'y' }
];

const makeVehicle = (overrides: Partial<VehicleEntry> = {}): VehicleEntry => ({
	id: 'vehicle-1',
	photoIds: [],
	licensePlate: 'K-AB 1234',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'Audi',
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

const findRow = (rows: { label: string; value: string }[], label: string) =>
	rows.find((row) => row.label === label);

describe('buildVehicleSummaryRows: vollständiges Fahrzeug', () => {
	it('baut alle Zeilen mit includeEmpty: true', () => {
		const rows = buildVehicleSummaryRows(makeVehicle(), incidentTypes, { includeEmpty: true });
		expect(findRow(rows, 'Kennzeichen')?.value).toBe('K-AB 1234');
		expect(findRow(rows, 'Fahrzeug')?.value).toBe('PKW · Audi · Rot');
		expect(findRow(rows, 'Tatort')?.value).toBe('Domkloster 4, 50667 Köln');
		expect(findRow(rows, 'Datum / Uhrzeit')?.value).toBe('01.03.2026, 14:30 Uhr');
		expect(findRow(rows, 'Art des Verstoßes')?.value).toBe('Parken auf dem Gehweg');
	});

	it('baut alle Zeilen mit includeEmpty: false', () => {
		const rows = buildVehicleSummaryRows(makeVehicle(), incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Kennzeichen')?.value).toBe('K-AB 1234');
		expect(findRow(rows, 'Fahrzeug')?.value).toBe('PKW · Audi · Rot');
		expect(findRow(rows, 'Tatort')?.value).toBe('Domkloster 4, 50667 Köln');
		expect(findRow(rows, 'Datum / Uhrzeit')?.value).toBe('01.03.2026, 14:30 Uhr');
	});

	it('zeigt Freitext-Notizen nur bei tatsächlichem Inhalt', () => {
		const rowsWithNotes = buildVehicleSummaryRows(
			makeVehicle({ notes: 'Achtung, Anwohnerparkzone' }),
			incidentTypes,
			{ includeEmpty: true }
		);
		expect(findRow(rowsWithNotes, 'Weitere Angaben')?.value).toBe('Achtung, Anwohnerparkzone');

		const rowsWithoutNotes = buildVehicleSummaryRows(makeVehicle({ notes: '' }), incidentTypes, {
			includeEmpty: true
		});
		expect(findRow(rowsWithoutNotes, 'Weitere Angaben')).toBeUndefined();
	});
});

describe('buildVehicleSummaryRows: komplett leeres Fahrzeug', () => {
	const emptyVehicle = makeVehicle({
		licensePlate: '',
		vehicleType: '',
		make: '',
		color: '',
		incidentTypeIds: [],
		notes: '',
		date: '',
		time: '',
		locationStreet: '',
		locationHouseNumber: '',
		locationPostcode: '',
		locationCity: ''
	});

	it('zeigt "—"-Platzhalter für jedes Feld bei includeEmpty: true', () => {
		const rows = buildVehicleSummaryRows(emptyVehicle, incidentTypes, { includeEmpty: true });
		expect(findRow(rows, 'Kennzeichen')?.value).toBe('—');
		expect(findRow(rows, 'Fahrzeug')?.value).toBe('— ·  · —');
		expect(findRow(rows, 'Tatort')?.value).toBe('—');
		expect(findRow(rows, 'Datum / Uhrzeit')?.value).toBe('—');
		expect(findRow(rows, 'Art des Verstoßes')?.value).toBe('—');
		expect(findRow(rows, 'Weitere Angaben')).toBeUndefined();
	});

	it('blendet alle leeren Zeilen bei includeEmpty: false komplett aus', () => {
		const rows = buildVehicleSummaryRows(emptyVehicle, incidentTypes, { includeEmpty: false });
		expect(rows).toEqual([]);
	});
});

describe('buildVehicleSummaryRows: Bug-Fixes für Teilangaben (includeEmpty: false)', () => {
	it('zeigt "PLZ Ort" ohne Straße, wenn nur Postleitzahl/Ort gesetzt sind', () => {
		const vehicle = makeVehicle({
			locationStreet: '',
			locationHouseNumber: '',
			locationPostcode: '50667',
			locationCity: 'Köln'
		});
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Tatort')?.value).toBe('50667 Köln');
	});

	it('zeigt nur den Ort, wenn Postleitzahl fehlt', () => {
		const vehicle = makeVehicle({
			locationStreet: '',
			locationHouseNumber: '',
			locationPostcode: '',
			locationCity: 'Köln'
		});
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Tatort')?.value).toBe('Köln');
	});

	it('zeigt die Fahrzeugbeschreibung, wenn nur Fahrzeugart/Marke gesetzt sind, aber Farbe fehlt', () => {
		const vehicle = makeVehicle({ vehicleType: 'PKW', make: 'Audi', color: '' });
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Fahrzeug')?.value).toBe('PKW · Audi');
	});

	it('zeigt die Fahrzeugbeschreibung, wenn nur die Farbe gesetzt ist', () => {
		const vehicle = makeVehicle({ vehicleType: '', make: '', color: 'Rot' });
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Fahrzeug')?.value).toBe('Rot');
	});

	it('zeigt nur das Datum, wenn die Uhrzeit fehlt', () => {
		const vehicle = makeVehicle({ date: '2026-03-01', time: '' });
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Datum / Uhrzeit')?.value).toBe('01.03.2026');
	});

	it('zeigt nur die Uhrzeit, wenn das Datum fehlt', () => {
		const vehicle = makeVehicle({ date: '', time: '14:30' });
		const rows = buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false });
		expect(findRow(rows, 'Datum / Uhrzeit')?.value).toBe('14:30 Uhr');
	});
});
