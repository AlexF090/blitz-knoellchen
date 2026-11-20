import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';
import type { DraftFormData } from './db';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

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
 * Prüft einen aus IndexedDB gelesenen Rohwert und liefert den normalisierten Entwurf.
 * Ungültige oder zu alte Entwürfe ergeben `undefined`.
 */
export const parseStoredDraft = (
	raw: unknown,
	now: number,
	maxAgeMs: number
): DraftFormData | undefined => {
	if (!isRecord(raw)) return undefined;
	const { savedAt, vehicles, photos } = raw;

	// Ein Entwurf kann aus einer älteren App-Version mit abweichendem Schema stammen. Ungeprüft
	// übernommen gäbe das einen TypeError beim Rendering und die App hinge dauerhaft im
	// Lade-Skeleton.
	if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return undefined;
	if (!Array.isArray(vehicles) || !vehicles.every(isValidVehicle)) return undefined;
	if (!Array.isArray(photos) || !photos.every(isValidPhoto)) return undefined;
	if (now - savedAt > maxAgeMs) return undefined;

	return { vehicles, photos };
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
