import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface HistoryEntry {
	id: string;
	timestamp: number;
	firstName: string;
	lastName: string;
	locationAddress: string;
	incidentTypeLabels: string[];
	licensePlate?: string;
	notes?: string;
	thumbnails: Blob[];
}

export interface UserProfile {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressHouseNumber: string;
	addressPostcode: string;
	addressCity: string;
	email: string;
}

interface StoredUserProfile extends UserProfile {
	id: string;
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
}

const DB_NAME = 'blitz-knoellchen';
const STORE_NAME = 'entries';
const PROFILE_STORE_NAME = 'profile';
const PROFILE_KEY = 'default';

let dbPromise: Promise<IDBPDatabase<BlitzKnoellchenDB>> | undefined;

const getDb = () => {
	dbPromise ??= openDB<BlitzKnoellchenDB>(DB_NAME, 2, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('by-timestamp', 'timestamp');
			}
			if (oldVersion < 2) {
				db.createObjectStore(PROFILE_STORE_NAME, { keyPath: 'id' });
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
	const {
		firstName,
		lastName,
		addressStreet,
		addressHouseNumber,
		addressPostcode,
		addressCity,
		email
	} = stored;
	return {
		firstName,
		lastName,
		addressStreet,
		addressHouseNumber,
		addressPostcode,
		addressCity,
		email
	};
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
	const db = await getDb();
	await db.put(PROFILE_STORE_NAME, { ...profile, id: PROFILE_KEY });
};
