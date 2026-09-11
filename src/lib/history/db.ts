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
	thumbnail: Blob;
}

interface KnoellchenBlitzDB extends DBSchema {
	entries: {
		key: string;
		value: HistoryEntry;
		indexes: { 'by-timestamp': number };
	};
}

const DB_NAME = 'knoellchen-blitz';
const STORE_NAME = 'entries';

let dbPromise: Promise<IDBPDatabase<KnoellchenBlitzDB>> | undefined;

function getDb() {
	dbPromise ??= openDB<KnoellchenBlitzDB>(DB_NAME, 1, {
		upgrade(db) {
			const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			store.createIndex('by-timestamp', 'timestamp');
		}
	});
	return dbPromise;
}

export async function addEntry(entry: HistoryEntry): Promise<void> {
	const db = await getDb();
	await db.put(STORE_NAME, entry);
}

export async function listEntries(): Promise<HistoryEntry[]> {
	const db = await getDb();
	const entries = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
	return entries.reverse();
}

export async function getEntry(id: string): Promise<HistoryEntry | undefined> {
	const db = await getDb();
	return db.get(STORE_NAME, id);
}
