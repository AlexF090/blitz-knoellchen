import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';
import { ENDANGERED_PERSON_OPTIONS, IMPAIRMENT_OPTIONS } from '$lib/config/impactOptions';
import type { DraftUiState, LoadedDraft } from './db';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

// Ältere Entwürfe kennen die Felder nicht (-> leer); unbekannte oder doppelte ids fallen weg.
const knownIds = (value: unknown, allowed: { id: string }[]): string[] =>
	Array.isArray(value)
		? [...new Set(value)].filter((id): id is string => allowed.some((option) => option.id === id))
		: [];

const isValidVehicle = (value: unknown): value is VehicleEntry => {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === 'string' &&
		Array.isArray(value.photoIds) &&
		value.photoIds.every((id) => typeof id === 'string') &&
		typeof value.licensePlate === 'string' &&
		typeof value.make === 'string' &&
		typeof value.color === 'string' &&
		Array.isArray(value.incidentTypeIds) &&
		typeof value.date === 'string' &&
		typeof value.time === 'string' &&
		(value.timeMode === 'halteverstoss' || value.timeMode === 'parkverstoss') &&
		typeof value.locationStreet === 'string' &&
		typeof value.locationPostcode === 'string' &&
		typeof value.locationCity === 'string'
	);
};

const isValidPhoto = (value: unknown): value is PhotoEntry => {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === 'string' && value.blob instanceof Blob && typeof value.fileName === 'string'
	);
};

/**
 * Normalisiert die gespeicherte Oberflächen-Ansicht. Fehlende oder ungültige Teile ergeben
 * Standardwerte; Einträge zu nicht (mehr) vorhandenen Fahrzeugen fallen weg.
 */
const parseUiState = (value: unknown, vehicles: VehicleEntry[]): DraftUiState => {
	const ui = isRecord(value) ? value : {};
	const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));

	const collapsedVehicleIds = Array.isArray(ui.collapsedVehicleIds)
		? [...new Set(ui.collapsedVehicleIds)].filter(
				(id): id is string => typeof id === 'string' && vehicleIds.has(id)
			)
		: [];
	const scrollY =
		typeof ui.scrollY === 'number' && Number.isFinite(ui.scrollY) && ui.scrollY >= 0
			? ui.scrollY
			: 0;
	const geocodeWarnings: Record<string, string> = {};
	if (isRecord(ui.geocodeWarnings)) {
		for (const [vehicleId, warning] of Object.entries(ui.geocodeWarnings)) {
			if (vehicleIds.has(vehicleId) && typeof warning === 'string') {
				geocodeWarnings[vehicleId] = warning;
			}
		}
	}
	return { collapsedVehicleIds, scrollY, geocodeWarnings };
};

/**
 * Prüft einen aus IndexedDB gelesenen Rohwert und liefert den normalisierten Entwurf.
 * Ungültige oder zu alte Entwürfe ergeben `undefined`.
 */
export const parseStoredDraft = (
	raw: unknown,
	now: number,
	maxAgeMs: number
): LoadedDraft | undefined => {
	if (!isRecord(raw)) return undefined;
	const { savedAt, vehicles, photos } = raw;

	// Ein Entwurf kann aus einer älteren App-Version mit abweichendem Schema stammen. Ungeprüft
	// übernommen gäbe das einen TypeError beim Rendering und die App hinge dauerhaft im
	// Lade-Skeleton.
	if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return undefined;
	if (!Array.isArray(vehicles) || !vehicles.every(isValidVehicle)) return undefined;
	if (!Array.isArray(photos) || !photos.every(isValidPhoto)) return undefined;
	if (now - savedAt > maxAgeMs) return undefined;

	const normalizedVehicles = vehicles.map((vehicle) => ({
		...vehicle,
		impairmentIds: knownIds(vehicle.impairmentIds, IMPAIRMENT_OPTIONS),
		endangeredPersonIds: knownIds(vehicle.endangeredPersonIds, ENDANGERED_PERSON_OPTIONS),
		endangeredPersonsNote:
			typeof vehicle.endangeredPersonsNote === 'string' ? vehicle.endangeredPersonsNote : ''
	}));

	return {
		vehicles: normalizedVehicles,
		photos,
		ui: parseUiState(raw.ui, normalizedVehicles),
		savedAt
	};
};

/**
 * Setzt die Blobs aus dem Foto-Store wieder an die Foto-Metadaten des Entwurfs. Ein Foto, das
 * bereits ein Blob trägt (Entwurf im alten Format mit eingebetteten Blobs), bleibt unverändert.
 */
// Fehlt der Blob eines referenzierten Fotos, bleibt das Foto ohne Blob. `parseStoredDraft`
// verwirft den ganzen Entwurf dann als ungültig: Ein Entwurf mit Lücke wäre verwirrender als
// ein leerer, und die Fotos lassen sich schnell neu aufnehmen.
export const joinPhotoBlobs = (raw: unknown, blobsById: ReadonlyMap<string, Blob>): unknown => {
	if (!isRecord(raw) || !Array.isArray(raw.photos)) return raw;

	const photos = raw.photos.map((photo: unknown) => {
		if (!isRecord(photo) || photo.blob instanceof Blob || typeof photo.id !== 'string') {
			return photo;
		}
		const blob = blobsById.get(photo.id);
		return blob ? { ...photo, blob } : photo;
	});
	return { ...raw, photos };
};
