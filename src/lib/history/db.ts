import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { joinPhotoBlobs, parseStoredDraft } from './draftSchema';
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
	/** Ausmaß der Behinderung; fehlt bei Einträgen aus älteren App-Versionen. */
	impairmentLabels?: string[];
	/** Gefährdete Personen; fehlt bei Einträgen aus älteren App-Versionen. */
	endangeredPersonLabels?: string[];
	endangeredPersonsNote?: string;
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

/** Oberflächen-Zustand des Formulars, den ein fortgesetzter Entwurf wiederherstellt. */
export interface DraftUiState {
	/** Ids der zugeklappten Fahrzeug-Karten. */
	collapsedVehicleIds: string[];
	/** Vertikale Scrollposition der Seite in Pixeln. */
	scrollY: number;
	/** Hinweise zur Adressauflösung je Fahrzeug-id. */
	geocodeWarnings: Record<string, string>;
}

/** Der zwischengespeicherte, noch nicht abgesendete Formularstand. */
export interface DraftFormData {
	vehicles: VehicleEntry[];
	photos: PhotoEntry[];
	ui: DraftUiState;
}

/** Ein gelesener Entwurf samt dem Zeitpunkt (Epoch-Millisekunden), zu dem er gespeichert wurde. */
export interface LoadedDraft extends DraftFormData {
	savedAt: number;
}

/** Foto-Metadaten im Entwurfsdatensatz; der Blob liegt separat im Store `draftPhotos`. */
type StoredDraftPhoto = Omit<PhotoEntry, 'blob'>;

interface StoredDraft {
	id: string;
	vehicles: VehicleEntry[];
	photos: StoredDraftPhoto[];
	ui: DraftUiState;
	savedAt: number;
}

interface StoredDraftPhotoBlob {
	id: string;
	blob: Blob;
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
	draftPhotos: {
		key: string;
		value: StoredDraftPhotoBlob;
	};
}

const DB_NAME = 'blitz-knoellchen';
const STORE_NAME = 'entries';
const PROFILE_STORE_NAME = 'profile';
const PROFILE_KEY = 'default';
const DRAFT_STORE_NAME = 'draft';
const DRAFT_PHOTO_STORE_NAME = 'draftPhotos';
const DRAFT_KEY = 'default';

/** Höchstalter eines Entwurfs; ältere werden beim nächsten Laden verworfen. */
// Ein nie abgesendeter Entwurf soll nicht unbegrenzt als Datenschutz-Altlast in der IndexedDB
// liegen bleiben; sieben Tage reichen, um die Anzeige später in Ruhe fortzusetzen.
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase<BlitzKnoellchenDB>> | undefined;

const getDb = () => {
	dbPromise ??= openDB<BlitzKnoellchenDB>(DB_NAME, 4, {
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
			// `upgrade` läuft nur für Stände unterhalb der aktuellen Version 4: Der Store der
			// jüngsten Version existiert hier nie, eine Versionsprüfung wäre ein toter Zweig.
			db.createObjectStore(DRAFT_PHOTO_STORE_NAME, { keyPath: 'id' });
		},
		// Eine andere Verbindung will die Datenbank upgraden oder löschen, z.B. eine neuere
		// App-Version in einem zweiten Tab. Ohne Freigabe wartet sie unbegrenzt auf diese hier.
		// Der nächste Zugriff öffnet die Datenbank neu.
		blocking() {
			const openConnection = dbPromise;
			dbPromise = undefined;
			void openConnection?.then((db) => db.close());
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

/**
 * Liest den zwischengespeicherten Entwurf. Ein ungültiger oder zu alter Entwurf wird gelöscht
 * und als `undefined` gemeldet.
 */
export const getDraft = async (): Promise<LoadedDraft | undefined> => {
	const db = await getDb();
	const transaction = db.transaction([DRAFT_STORE_NAME, DRAFT_PHOTO_STORE_NAME], 'readwrite');
	const stored = await transaction.objectStore(DRAFT_STORE_NAME).get(DRAFT_KEY);
	if (!stored) {
		// Blobs ohne Datensatz stammen aus einem abgebrochenen Schreibvorgang und wären sonst
		// dauerhaft unerreichbar.
		await Promise.all([transaction.objectStore(DRAFT_PHOTO_STORE_NAME).clear(), transaction.done]);
		return undefined;
	}

	const photoBlobs = await transaction.objectStore(DRAFT_PHOTO_STORE_NAME).getAll();
	const blobsById = new Map(photoBlobs.map((photoBlob) => [photoBlob.id, photoBlob.blob]));
	const draft = parseStoredDraft(joinPhotoBlobs(stored, blobsById), Date.now(), DRAFT_MAX_AGE_MS);
	if (!draft) {
		await Promise.all([
			transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_KEY),
			transaction.objectStore(DRAFT_PHOTO_STORE_NAME).clear()
		]);
	}
	await transaction.done;
	return draft;
};

/**
 * Speichert den aktuellen Formularstand als Entwurf und aktualisiert dessen Zeitstempel.
 * Fotos liegen in einem eigenen Store: Der Autosave schreibt nur Metadaten neu und legt die
 * Blobs bislang unbekannter Fotos an.
 */
export const saveDraft = async ({ vehicles, photos, ui }: DraftFormData): Promise<void> => {
	const db = await getDb();
	const transaction = db.transaction([DRAFT_STORE_NAME, DRAFT_PHOTO_STORE_NAME], 'readwrite');
	const photoStore = transaction.objectStore(DRAFT_PHOTO_STORE_NAME);

	// Alles außer dem Blob ist Metadaten, neue Felder von `PhotoEntry` werden so mitgespeichert.
	const photoMetadata: StoredDraftPhoto[] = photos.map((photo) => {
		// Der Blob wird nur zum Abtrennen aus dem Rest-Objekt benannt.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { blob, ...metadata } = photo;
		return metadata;
	});
	const storedIds = new Set(await photoStore.getAllKeys());
	const currentIds = new Set(photos.map((photo) => photo.id));

	await Promise.all([
		transaction.objectStore(DRAFT_STORE_NAME).put({
			id: DRAFT_KEY,
			vehicles,
			photos: photoMetadata,
			ui,
			savedAt: Date.now()
		}),
		// Der Blob eines Fotos ändert sich pro id nie (`createPhotoEntry` vergibt für jede
		// Verarbeitung eine neue id), ein vorhandener Eintrag muss also nicht neu geschrieben werden.
		...photos
			.filter((photo) => !storedIds.has(photo.id))
			.map((photo) => photoStore.put({ id: photo.id, blob: photo.blob })),
		...[...storedIds].filter((id) => !currentIds.has(id)).map((id) => photoStore.delete(id)),
		transaction.done
	]);
};

/** Verwirft den gespeicherten Entwurf samt seiner Fotos. */
export const clearDraft = async (): Promise<void> => {
	const db = await getDb();
	const transaction = db.transaction([DRAFT_STORE_NAME, DRAFT_PHOTO_STORE_NAME], 'readwrite');
	await Promise.all([
		transaction.objectStore(DRAFT_STORE_NAME).clear(),
		transaction.objectStore(DRAFT_PHOTO_STORE_NAME).clear(),
		transaction.done
	]);
};
