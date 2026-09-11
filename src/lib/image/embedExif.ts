import piexif from 'piexifjs';
import type { ParsedExif } from '$lib/exif/parseExif';

function pad(value: number): string {
	return value.toString().padStart(2, '0');
}

function toExifDateTime(date: Date): string {
	const datePart = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())}`;
	const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	return `${datePart} ${timePart}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Blob konnte nicht gelesen werden.'));
		reader.readAsDataURL(blob);
	});
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
	const response = await fetch(dataUrl);
	return response.blob();
}

/**
 * Bettet Aufnahmedatum und GPS-Position aus den ursprünglichen EXIF-Daten in ein JPEG ein.
 * HEIC-Konvertierung und Canvas-basierte Kompression verwerfen EXIF beim Re-Encoding, daher
 * müssen Datum/GPS danach separat wieder eingefügt werden.
 */
export async function embedExifMetadata(jpegBlob: Blob, exif: ParsedExif): Promise<Blob> {
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
		return await dataUrlToBlob(withExif);
	} catch {
		return jpegBlob;
	}
}
