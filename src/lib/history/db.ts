import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';

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

// Ein nie abgesendeter Entwurf soll nicht unbegrenzt als Datenschutz-Altlast in der IndexedDB
// liegen bleiben — nach dieser Zeit wird er beim nächsten Laden verworfen.
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

export const addEntry = async (entry: HistoryEntry): Promise<void> => {
	const db = await getDb();
	await db.put(STORE_NAME, entry);
};

export const listEntries = async (): Promise<HistoryEntry[]> => {
	const db = await getDb();
	const entries = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
	return entries.reverse();
};

export const getEntry = async (id: string): Promise<HistoryEntry | undefined> => {
	const db = await getDb();
	return db.get(STORE_NAME, id);
};

export const getProfile = async (): Promise<UserProfile | undefined> => {
	const db = await getDb();
	const stored = await db.get(PROFILE_STORE_NAME, PROFILE_KEY);
	if (!stored) return undefined;
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

// Ein Entwurf kann aus einer älteren App-Version mit abweichendem Schema stammen — ungültige
// Entwürfe werden verworfen statt ungeprüft übernommen (sonst TypeError beim Rendering, App
// hängt dauerhaft im Lade-Skeleton).
const isValidDraft = (stored: StoredDraft): boolean =>
	Number.isFinite(stored.savedAt) &&
	Array.isArray(stored.vehicles) &&
	stored.vehicles.every(isValidVehicle) &&
	Array.isArray(stored.photos) &&
	stored.photos.every(isValidPhoto);

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

export const saveDraft = async (vehicles: VehicleEntry[], photos: PhotoEntry[]): Promise<void> => {
	const db = await getDb();
	await db.put(DRAFT_STORE_NAME, { id: DRAFT_KEY, vehicles, photos, savedAt: Date.now() });
};

export const clearDraft = async (): Promise<void> => {
	const db = await getDb();
	await db.delete(DRAFT_STORE_NAME, DRAFT_KEY);
};
