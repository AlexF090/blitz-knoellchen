import { describe, expect, it } from 'vitest';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';
import { joinPhotoBlobs, parseStoredDraft } from './draftSchema';

const MAX_AGE = 1000;
const NOW = 10_000;

const makeVehicle = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: 'v1',
	photoIds: ['p1'],
	licensePlate: 'K-AB1234',
	make: 'VW',
	color: 'rot',
	incidentTypeIds: ['a'],
	date: '2026-01-01',
	time: '12:00',
	timeMode: 'halteverstoss',
	locationStreet: 'Straße 1',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const makePhoto = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: 'p1',
	blob: new Blob(['x']),
	fileName: 'foto.jpg',
	...overrides
});

const makeDraft = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: 'draft',
	savedAt: NOW,
	vehicles: [makeVehicle()],
	photos: [makePhoto()],
	...overrides
});

describe('parseStoredDraft', () => {
	it('liefert Fahrzeuge und Fotos eines gültigen Entwurfs', () => {
		const raw = makeDraft();
		const draft = parseStoredDraft(raw, NOW, MAX_AGE);
		expect(draft?.vehicles).toEqual(raw.vehicles as VehicleEntry[]);
		expect(draft?.photos).toEqual(raw.photos as PhotoEntry[]);
	});

	it('gibt die internen Felder des Stores nicht weiter', () => {
		expect(Object.keys(parseStoredDraft(makeDraft(), NOW, MAX_AGE) ?? {}).sort()).toEqual([
			'photos',
			'vehicles'
		]);
	});

	it.each([null, undefined, 'text', 42, []])('lehnt den Rohwert %j ab', (raw) => {
		expect(parseStoredDraft(raw, NOW, MAX_AGE)).toBeUndefined();
	});

	it.each([
		['savedAt fehlt', { savedAt: undefined }],
		['savedAt ist keine endliche Zahl', { savedAt: Number.NaN }],
		['vehicles ist kein Array', { vehicles: 'x' }],
		['photos ist kein Array', { photos: {} }],
		['Fahrzeug ist kein Objekt', { vehicles: [null] }],
		['Fahrzeug ohne id', { vehicles: [makeVehicle({ id: 1 })] }],
		['photoIds enthält Nicht-Strings', { vehicles: [makeVehicle({ photoIds: [1] })] }],
		['licensePlate fehlt', { vehicles: [makeVehicle({ licensePlate: undefined })] }],
		['make fehlt', { vehicles: [makeVehicle({ make: undefined })] }],
		['color fehlt', { vehicles: [makeVehicle({ color: undefined })] }],
		['incidentTypeIds ist kein Array', { vehicles: [makeVehicle({ incidentTypeIds: 'a' })] }],
		['date fehlt', { vehicles: [makeVehicle({ date: undefined })] }],
		['time fehlt', { vehicles: [makeVehicle({ time: undefined })] }],
		['timeMode unbekannt', { vehicles: [makeVehicle({ timeMode: 'x' })] }],
		['locationStreet fehlt', { vehicles: [makeVehicle({ locationStreet: undefined })] }],
		['locationPostcode fehlt', { vehicles: [makeVehicle({ locationPostcode: undefined })] }],
		['locationCity fehlt', { vehicles: [makeVehicle({ locationCity: undefined })] }],
		['Foto ist kein Objekt', { photos: [null] }],
		['Foto ohne id', { photos: [makePhoto({ id: undefined })] }],
		['Foto-Blob ist kein Blob', { photos: [makePhoto({ blob: 'x' })] }],
		['Foto ohne fileName', { photos: [makePhoto({ fileName: undefined })] }]
	])('lehnt einen Entwurf ab, wenn %s', (_name, overrides) => {
		expect(parseStoredDraft(makeDraft(overrides), NOW, MAX_AGE)).toBeUndefined();
	});

	it('akzeptiert einen Entwurf genau am Altersgrenzwert', () => {
		expect(parseStoredDraft(makeDraft({ savedAt: NOW - MAX_AGE }), NOW, MAX_AGE)).toBeDefined();
	});

	it('lehnt einen Entwurf ab, der älter als der Grenzwert ist', () => {
		expect(
			parseStoredDraft(makeDraft({ savedAt: NOW - MAX_AGE - 1 }), NOW, MAX_AGE)
		).toBeUndefined();
	});
});

describe('joinPhotoBlobs', () => {
	const blob = new Blob(['aus-dem-store']);

	it('setzt den Blob aus dem Store an ein Foto ohne Blob', () => {
		const raw = makeDraft({ photos: [makePhoto({ blob: undefined })] });
		const joined = joinPhotoBlobs(raw, new Map([['p1', blob]]));
		expect(parseStoredDraft(joined, NOW, MAX_AGE)?.photos[0].blob).toBe(blob);
	});

	it('behält den eingebetteten Blob eines Fotos im alten Format', () => {
		const raw = makeDraft();
		const joined = joinPhotoBlobs(raw, new Map([['p1', blob]]));
		expect(parseStoredDraft(joined, NOW, MAX_AGE)?.photos[0].blob).not.toBe(blob);
	});

	it('lässt ein Foto ohne Blob im Store unverändert, sodass der Entwurf ungültig wird', () => {
		const raw = makeDraft({ photos: [makePhoto({ blob: undefined })] });
		expect(parseStoredDraft(joinPhotoBlobs(raw, new Map()), NOW, MAX_AGE)).toBeUndefined();
	});

	it.each([
		['kein Objekt', 'text'],
		['photos ist kein Array', { photos: 'x' }],
		['Foto ist kein Objekt', { photos: [null] }],
		['Foto ohne id', { photos: [{ fileName: 'a' }] }]
	])('reicht den Rohwert durch, wenn %s', (_name, raw) => {
		expect(
			parseStoredDraft(joinPhotoBlobs(raw, new Map([['p1', blob]])), NOW, MAX_AGE)
		).toBeUndefined();
	});
});
