import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';

/** Eine abgesendete Anzeige, wie sie in der lokalen Historie gespeichert wird. */
export interface HistoryEntry {
	id: string;
	timestamp: number;
	firstName: string;
	lastName: string;
	locationAddress: string;
	incidentTypeLabels: string[];
	licensePlate?: string;
	licensePlateCountry?: string;
	vehicleType?: string;
	make?: string;
	color?: string;
	notes?: string;
	thumbnails: Blob[];
}

/** Die wiederverwendeten Stammdaten des Melders. */
export interface UserProfile {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressPostcode: string;
	addressCity: string;
	email: string;
	phone?: string;
}

interface StoredUserProfile extends UserProfile {
	id: string;
}

/** Der zwischengespeicherte, noch nicht abgesendete Formularstand. */
export interface DraftFormData {
	vehicles: VehicleEntry[];
	photos: PhotoEntry[];
}

interface StoredDraft extends DraftFormData {
	id: string;
	savedAt: number;
}

interface BlitzKnoellchenDB extends DBSchema {
	entries: {
		key: string;
		value: HistoryEntry;
		indexes: { 'by-timestamp': number };
	};
	profile: {
		key: string;
		value: StoredUserProfile;
	};
	draft: {
		key: string;
		value: StoredDraft;
	};
}

const DB_NAME = 'blitz-knoellchen';
const STORE_NAME = 'entries';
const PROFILE_STORE_NAME = 'profile';
const PROFILE_KEY = 'default';
const DRAFT_STORE_NAME = 'draft';
const DRAFT_KEY = 'default';

/** Höchstalter eines Entwurfs; ältere werden beim nächsten Laden verworfen. */
// Ein nie abgesendeter Entwurf soll nicht unbegrenzt als Datenschutz-Altlast in der IndexedDB
// liegen bleiben.
export const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase<BlitzKnoellchenDB>> | undefined;

const getDb = () => {
	dbPromise ??= openDB<BlitzKnoellchenDB>(DB_NAME, 3, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('by-timestamp', 'timestamp');
			}
			if (oldVersion < 2) {
				db.createObjectStore(PROFILE_STORE_NAME, { keyPath: 'id' });
			}
			if (oldVersion < 3) {
				db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
			}
		}
	});
	return dbPromise;
};

/** Speichert einen Historie-Eintrag; ein Eintrag mit gleicher id wird ersetzt. */
export const addEntry = async (entry: HistoryEntry): Promise<void> => {
	const db = await getDb();
	await db.put(STORE_NAME, entry);
};

/** Liefert alle Historie-Einträge, neueste zuerst. */
export const listEntries = async (): Promise<HistoryEntry[]> => {
	const db = await getDb();
	const entries = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
	// Der Index liefert aufsteigend; die Anzeige beginnt mit dem jüngsten Eintrag.
	return entries.reverse();
};

/** Liest einen einzelnen Historie-Eintrag, oder `undefined`, wenn es ihn nicht gibt. */
export const getEntry = async (id: string): Promise<HistoryEntry | undefined> => {
	const db = await getDb();
	return db.get(STORE_NAME, id);
};

/** Löscht einen einzelnen Historie-Eintrag. */
export const deleteEntry = async (id: string): Promise<void> => {
	const db = await getDb();
	await db.delete(STORE_NAME, id);
};

/** Löscht die gesamte Historie. */
export const clearEntries = async (): Promise<void> => {
	const db = await getDb();
	await db.clear(STORE_NAME);
};

/** Liest das gespeicherte Melderprofil, oder `undefined`, wenn noch keines angelegt wurde. */
export const getProfile = async (): Promise<UserProfile | undefined> => {
	const db = await getDb();
	const stored = await db.get(PROFILE_STORE_NAME, PROFILE_KEY);
	if (!stored) return undefined;
	// Felder einzeln übernehmen, damit der interne Store-Key `id` nicht nach außen dringt.
	const { firstName, lastName, addressStreet, addressPostcode, addressCity, email, phone } = stored;
	return {
		firstName,
		lastName,
		addressStreet,
		addressPostcode,
		addressCity,
		email,
		phone
	};
};

/** Speichert das Melderprofil und überschreibt dabei das bisherige. */
export const saveProfile = async (profile: UserProfile): Promise<void> => {
	const db = await getDb();
	await db.put(PROFILE_STORE_NAME, { ...profile, id: PROFILE_KEY });
};

const isValidVehicle = (value: unknown): value is VehicleEntry => {
	if (typeof value !== 'object' || value === null) return false;
	const vehicle = value as Partial<VehicleEntry>;
	return (
		typeof vehicle.id === 'string' &&
		Array.isArray(vehicle.photoIds) &&
		vehicle.photoIds.every((id) => typeof id === 'string') &&
		typeof vehicle.licensePlate === 'string' &&
		typeof vehicle.make === 'string' &&
		typeof vehicle.color === 'string' &&
		Array.isArray(vehicle.incidentTypeIds) &&
		typeof vehicle.date === 'string' &&
		typeof vehicle.time === 'string' &&
		(vehicle.timeMode === 'halteverstoss' || vehicle.timeMode === 'parkverstoss') &&
		typeof vehicle.locationStreet === 'string' &&
		typeof vehicle.locationPostcode === 'string' &&
		typeof vehicle.locationCity === 'string'
	);
};

const isValidPhoto = (value: unknown): value is PhotoEntry => {
	if (typeof value !== 'object' || value === null) return false;
	const photo = value as Partial<PhotoEntry>;
	return (
		typeof photo.id === 'string' && photo.blob instanceof Blob && typeof photo.fileName === 'string'
	);
};

// Ein Entwurf kann aus einer älteren App-Version mit abweichendem Schema stammen. Ungeprüft
// übernommen gäbe das einen TypeError beim Rendering und die App hinge dauerhaft im
// Lade-Skeleton.
const isValidDraft = (stored: StoredDraft): boolean =>
	Number.isFinite(stored.savedAt) &&
	Array.isArray(stored.vehicles) &&
	stored.vehicles.every(isValidVehicle) &&
	Array.isArray(stored.photos) &&
	stored.photos.every(isValidPhoto);

/**
 * Liest den zwischengespeicherten Entwurf. Ein ungültiger oder zu alter Entwurf wird gelöscht
 * und als `undefined` gemeldet.
 */
export const getDraft = async (): Promise<DraftFormData | undefined> => {
	const db = await getDb();
	const stored = await db.get(DRAFT_STORE_NAME, DRAFT_KEY);
	if (!stored) return undefined;

	if (!isValidDraft(stored) || Date.now() - stored.savedAt > DRAFT_MAX_AGE_MS) {
		await db.delete(DRAFT_STORE_NAME, DRAFT_KEY);
		return undefined;
	}

	return { vehicles: stored.vehicles, photos: stored.photos };
};

/** Speichert den aktuellen Formularstand als Entwurf und aktualisiert dessen Zeitstempel. */
export const saveDraft = async (vehicles: VehicleEntry[], photos: PhotoEntry[]): Promise<void> => {
	const db = await getDb();
	await db.put(DRAFT_STORE_NAME, { id: DRAFT_KEY, vehicles, photos, savedAt: Date.now() });
};

/** Verwirft den gespeicherten Entwurf. */
export const clearDraft = async (): Promise<void> => {
	const db = await getDb();
	await db.delete(DRAFT_STORE_NAME, DRAFT_KEY);
};
