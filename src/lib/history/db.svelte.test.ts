import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDB, openDB } from 'idb';
import {
	addEntry,
	getEntry,
	listEntries,
	deleteEntry,
	clearEntries,
	getProfile,
	saveProfile,
	getDraft,
	saveDraft,
	clearDraft,
	DRAFT_MAX_AGE_MS,
	type HistoryEntry,
	type UserProfile
} from './db';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';

// Schreibt einen rohen, ggf. schema-inkompatiblen Draft-Datensatz direkt in die bestehende
// IndexedDB — simuliert einen Entwurf aus einer Vorgängerversion, der über getDraft()/saveDraft()
// (mit aktuellem TypeScript-Typ) nicht mehr abbildbar wäre.
const writeRawDraft = async (value: unknown): Promise<void> => {
	const db = await openDB('blitz-knoellchen', 3);
	await db.put('draft', { id: 'default', ...(value as object) });
	db.close();
};

const makeVehicle = (overrides: Partial<VehicleEntry> = {}): VehicleEntry => ({
	id: crypto.randomUUID(),
	photoIds: [],
	licensePlate: 'K-AB 1234',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'Unbekannt',
	color: 'Rot',
	incidentTypeIds: ['gehweg'],
	notes: '',
	date: '2026-09-11',
	time: '12:00',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const makePhoto = (overrides: Partial<PhotoEntry> = {}): PhotoEntry => ({
	id: crypto.randomUUID(),
	blob: new Blob(['x'], { type: 'image/jpeg' }),
	fileName: 'foto.jpg',
	gps: null,
	date: null,
	time: null,
	...overrides
});

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => {
	return {
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		firstName: 'Max',
		lastName: 'Mustermann',
		locationAddress: 'Domkloster 4, 50667 Köln',
		incidentTypeLabels: ['Parken auf dem Gehweg'],
		thumbnails: [new Blob(['x'], { type: 'image/jpeg' })],
		...overrides
	};
};

// Diese Datei ist der einzige Test, der die echte IndexedDB anspricht; alle anderen mocken
// $lib/history/db. Sonst hinge das Ergebnis davon ab, welche Datei zuerst läuft.
const LEGACY_ENTRY_ID = 'eintrag-aus-version-2';
let entriesAfterMigration: HistoryEntry[] = [];
let profileAfterMigration: UserProfile | undefined;

beforeAll(async () => {
	// Legt die Datenbank im Stand von Version 2 an (Historie und Profil, noch ohne Entwurf), bevor
	// db.ts sie zum ersten Mal öffnet. Der erste Zugriff unten läuft damit über den echten
	// Migrationspfad; das Neuanlegen im Test „gibt die Verbindung frei“ deckt den Pfad ab Version 0 ab.
	await deleteDB('blitz-knoellchen');
	const legacyDb = await openDB('blitz-knoellchen', 2, {
		upgrade(db) {
			const store = db.createObjectStore('entries', { keyPath: 'id' });
			store.createIndex('by-timestamp', 'timestamp');
			db.createObjectStore('profile', { keyPath: 'id' });
		}
	});
	await legacyDb.put('entries', makeEntry({ id: LEGACY_ENTRY_ID }));
	legacyDb.close();

	entriesAfterMigration = await listEntries();
	profileAfterMigration = await getProfile();
});

beforeEach(async () => {
	await clearEntries();
	await clearDraft();
	const db = await openDB('blitz-knoellchen', 3);
	await db.clear('profile');
	db.close();
});

describe('Migration', () => {
	it('übernimmt beim Upgrade von Version 2 die Einträge und legt den Entwurfs-Store an', async () => {
		expect(entriesAfterMigration.map((entry) => entry.id)).toEqual([LEGACY_ENTRY_ID]);
		expect(profileAfterMigration).toBeUndefined();
		expect(await getDraft()).toBeUndefined();
	});

	it('gibt die Verbindung frei, wenn eine andere Verbindung die Datenbank löschen will', async () => {
		await listEntries();

		// Ohne Freigabe bliebe deleteDB hängen und der Test liefe in den Timeout.
		await deleteDB('blitz-knoellchen');

		// Der nächste Zugriff legt die Datenbank frisch an.
		const entry = makeEntry();
		await addEntry(entry);
		expect(await listEntries()).toEqual([expect.objectContaining({ id: entry.id })]);
	});
});

describe('history db', () => {
	it('speichert und liest einen Eintrag', async () => {
		const entry = makeEntry();
		await addEntry(entry);
		const loaded = await getEntry(entry.id);
		expect(loaded?.id).toBe(entry.id);
		expect(loaded?.locationAddress).toBe(entry.locationAddress);
	});

	it('listet Einträge absteigend nach Zeitstempel', async () => {
		const older = makeEntry({ timestamp: 1000 });
		const newer = makeEntry({ timestamp: 2000 });
		await addEntry(older);
		await addEntry(newer);

		const entries = await listEntries();
		const olderIndex = entries.findIndex((e) => e.id === older.id);
		const newerIndex = entries.findIndex((e) => e.id === newer.id);
		expect(newerIndex).toBeLessThan(olderIndex);
	});

	it('löscht einen einzelnen Eintrag', async () => {
		const toDelete = makeEntry();
		const toKeep = makeEntry();
		await addEntry(toDelete);
		await addEntry(toKeep);

		await deleteEntry(toDelete.id);

		expect(await getEntry(toDelete.id)).toBeUndefined();
		const remainingIds = (await listEntries()).map((e) => e.id);
		expect(remainingIds).not.toContain(toDelete.id);
		expect(remainingIds).toContain(toKeep.id);
	});

	it('löscht alle Einträge', async () => {
		await addEntry(makeEntry());
		await addEntry(makeEntry());

		await clearEntries();

		expect(await listEntries()).toEqual([]);
	});
});

describe('user profile', () => {
	it('speichert und liest ein Profil', async () => {
		const profile: UserProfile = {
			firstName: 'Max',
			lastName: 'Mustermann',
			addressStreet: 'Musterstraße 1',
			addressPostcode: '50667',
			addressCity: 'Köln',
			email: 'max@example.com'
		};
		await saveProfile(profile);
		expect(await getProfile()).toEqual(profile);
	});

	it('liefert undefined, wenn noch kein Profil gespeichert ist', async () => {
		expect(await getProfile()).toBeUndefined();
	});

	it('überschreibt ein bestehendes Profil beim erneuten Speichern', async () => {
		await saveProfile({
			firstName: 'Erika',
			lastName: 'Musterfrau',
			addressStreet: 'Musterweg 2',
			addressPostcode: '50668',
			addressCity: 'Köln',
			email: 'erika@example.com'
		});
		const loaded = await getProfile();
		expect(loaded?.firstName).toBe('Erika');
	});
});

describe('draft', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('speichert und liest einen Entwurf', async () => {
		const vehicle = makeVehicle();
		const photo = makePhoto();
		await saveDraft([vehicle], [photo]);

		const draft = await getDraft();
		expect(draft?.vehicles).toEqual([vehicle]);
		expect(draft?.photos.map((p) => p.id)).toEqual([photo.id]);
	});

	it('überschreibt einen bestehenden Entwurf beim erneuten Speichern', async () => {
		await saveDraft([makeVehicle({ licensePlate: 'K-AA 1' })], []);
		await saveDraft([makeVehicle({ licensePlate: 'K-BB 2' })], []);

		const draft = await getDraft();
		expect(draft?.vehicles).toHaveLength(1);
		expect(draft?.vehicles[0].licensePlate).toBe('K-BB 2');
	});

	it('liefert undefined, wenn kein Entwurf existiert', async () => {
		await clearDraft();
		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen abgelaufenen Entwurf und löscht ihn', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		await saveDraft([makeVehicle()], []);

		vi.setSystemTime(DRAFT_MAX_AGE_MS + 1);
		expect(await getDraft()).toBeUndefined();

		vi.useRealTimers();
		expect(await getDraft()).toBeUndefined();
	});

	it('löscht einen Entwurf explizit', async () => {
		await saveDraft([makeVehicle()], []);
		await clearDraft();
		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen strukturell inkompatiblen Alt-Entwurf (fehlendes photoIds) und löscht ihn', async () => {
		const legacyVehicle = { ...makeVehicle(), photoIds: undefined };
		await writeRawDraft({ vehicles: [legacyVehicle], photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
		// nach dem Verwerfen bleibt kein Rest-Draft zurück
		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit fehlendem savedAt statt ihn als frisch zu behandeln', async () => {
		await writeRawDraft({ vehicles: [makeVehicle()], photos: [] });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit nicht-stringwertiger Foto-ID am Fahrzeug', async () => {
		const vehicle = { ...makeVehicle(), photoIds: [123] };
		await writeRawDraft({ vehicles: [vehicle], photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit strukturell inkompatiblem Foto (fehlendes blob)', async () => {
		const legacyPhoto = { ...makePhoto(), blob: undefined };
		await writeRawDraft({
			vehicles: [makeVehicle()],
			photos: [legacyPhoto],
			savedAt: Date.now()
		});

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf, wenn vehicles kein Array ist', async () => {
		await writeRawDraft({ vehicles: 'nicht-array', photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit ungültigem timeMode', async () => {
		const legacyVehicle = { ...makeVehicle(), timeMode: 'unbekannt' };
		await writeRawDraft({ vehicles: [legacyVehicle], photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf, dessen Fahrzeugeintrag kein Objekt ist', async () => {
		await writeRawDraft({ vehicles: [null], photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit nicht-stringwertiger Fahrzeug-id', async () => {
		const legacyVehicle = { ...makeVehicle(), id: 123 };
		await writeRawDraft({ vehicles: [legacyVehicle], photos: [], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf, wenn photos kein Array ist', async () => {
		await writeRawDraft({ vehicles: [makeVehicle()], photos: 'nicht-array', savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf, dessen Foto-Eintrag kein Objekt ist', async () => {
		await writeRawDraft({ vehicles: [], photos: [null], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});

	it('verwirft einen Entwurf mit nicht-stringwertigem Foto-Dateinamen', async () => {
		const legacyPhoto = { ...makePhoto(), fileName: 42 };
		await writeRawDraft({ vehicles: [], photos: [legacyPhoto], savedAt: Date.now() });

		expect(await getDraft()).toBeUndefined();
	});
});
