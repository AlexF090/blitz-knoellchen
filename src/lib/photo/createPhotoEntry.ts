import { parseExif } from '$lib/exif/parseExif';
import { compressImage } from '$lib/image/compress';
import { convertHeicToJpeg, isHeicFile } from '$lib/image/convertHeic';
import { embedExifMetadata } from '$lib/image/embedExif';
import type { PhotoEntry } from '$lib/validation/formSchema';

export class HeicConversionError extends Error {}

const HEIC_CONVERSION_ERROR_MESSAGE =
	'Dieses HEIC-Foto konnte nicht verarbeitet werden. Bitte ein JPEG/PNG-Foto wählen oder in ' +
	'den Kameraeinstellungen "Am kompatibelsten" aktivieren.';

// HEIC→JPEG-Konvertierung, Kompression, EXIF-Einbettung. Wirft HeicConversionError statt
// `null` zurückzugeben, damit der Aufrufer denselben Early-Return-Pfad wie zuvor abbilden kann.
export const createPhotoEntry = async (file: File): Promise<PhotoEntry> => {
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
