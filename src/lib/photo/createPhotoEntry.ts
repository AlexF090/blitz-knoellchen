import { parseExif } from '$lib/exif/parseExif';
import { compressImage } from '$lib/image/compress';
import { convertHeicToJpeg, isHeicFile } from '$lib/image/convertHeic';
import { embedExifMetadata } from '$lib/image/embedExif';
import type { PhotoEntry } from '$lib/validation/formSchema';

/** Signalisiert, dass ein HEIC-Foto nicht in ein verarbeitbares JPEG konvertiert werden konnte. */
export class HeicConversionError extends Error {}

const HEIC_CONVERSION_ERROR_MESSAGE =
	'Dieses HEIC-Foto konnte nicht verarbeitet werden. Bitte ein JPEG/PNG-Foto wählen oder in ' +
	'den Kameraeinstellungen "Am kompatibelsten" aktivieren.';

/**
 * Macht aus einer ausgewählten Bilddatei einen versandfertigen Foto-Eintrag: HEIC→JPEG,
 * Kompression, Wiedereinbetten der EXIF-Daten. Wirft `HeicConversionError`, wenn die
 * Konvertierung scheitert.
 */
export const createPhotoEntry = async (file: File): Promise<PhotoEntry> => {
	// Vor der Konvertierung lesen — beide folgenden Schritte kodieren das Bild neu und
	// verwerfen dabei die ursprünglichen EXIF-Daten.
	const exif = await parseExif(file);

	let rawBlob: Blob = file;
	if (isHeicFile(file)) {
		try {
			rawBlob = await convertHeicToJpeg(file);
		} catch {
			throw new HeicConversionError(HEIC_CONVERSION_ERROR_MESSAGE);
		}
	}

	const compressed = await compressImage(rawBlob, { maxDimension: 1600, quality: 0.8 });
	const withExif = await embedExifMetadata(compressed, exif);

	return {
		id: crypto.randomUUID(),
		blob: withExif,
		fileName: file.name,
		gps: exif.gps,
		date: exif.date,
		time: exif.time
	};
};
