import type { ParsedExif } from '$lib/exif/parseExif';
import piexif from 'piexifjs';

const pad = (value: number): string => {
	return value.toString().padStart(2, '0');
};

const toExifDateTime = (date: Date): string => {
	const datePart = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())}`;
	const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	return `${datePart} ${timePart}`;
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Blob konnte nicht gelesen werden.'));
		reader.readAsDataURL(blob);
	});
};

// Dekodiert von Hand statt per fetch(dataUrl): Die CSP erlaubt `connect-src` nur für 'self',
// ein fetch auf eine data:-URL würde im Production-Build blockiert.
const jpegDataUrlToBlob = (dataUrl: string): Blob => {
	const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
	return new Blob([bytes], { type: 'image/jpeg' });
};

/**
 * Bettet Aufnahmedatum und GPS-Position aus den ursprünglichen EXIF-Daten in ein JPEG ein.
 * HEIC-Konvertierung und Canvas-basierte Kompression verwerfen EXIF beim Re-Encoding, daher
 * müssen Datum/GPS danach separat wieder eingefügt werden.
 */
export const embedExifMetadata = async (jpegBlob: Blob, exif: ParsedExif): Promise<Blob> => {
	if (!exif.gps && !exif.dateTimeOriginal) return jpegBlob;

	try {
		const exifDict: Record<string, Record<number, string | number | [number, number][]>> = {
			'0th': {},
			Exif: {},
			GPS: {}
		};

		if (exif.dateTimeOriginal) {
			const formatted = toExifDateTime(exif.dateTimeOriginal);
			exifDict['0th'][piexif.ImageIFD.DateTime] = formatted;
			exifDict.Exif[piexif.ExifIFD.DateTimeOriginal] = formatted;
		}

		if (exif.gps) {
			exifDict.GPS[piexif.GPSIFD.GPSLatitudeRef] = exif.gps.lat >= 0 ? 'N' : 'S';
			exifDict.GPS[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(exif.gps.lat);
			exifDict.GPS[piexif.GPSIFD.GPSLongitudeRef] = exif.gps.lon >= 0 ? 'E' : 'W';
			exifDict.GPS[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(exif.gps.lon);
		}

		const dataUrl = await blobToDataUrl(jpegBlob);
		const withExif = piexif.insert(piexif.dump(exifDict), dataUrl);
		return jpegDataUrlToBlob(withExif);
	} catch {
		// Metadaten sind ein Zusatz, kein Muss — lieber das Foto ohne EXIF senden als den
		// Upload wegen eines Encoding-Fehlers ganz scheitern zu lassen.
		return jpegBlob;
	}
};
