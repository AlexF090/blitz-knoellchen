import { parseExif, type ParsedExif } from '$lib/exif/parseExif';
import { describe, expect, it } from 'vitest';
import { embedExifMetadata } from './embedExif';

const makeTestJpeg = (): Promise<Blob> => {
	const canvas = document.createElement('canvas');
	canvas.width = 20;
	canvas.height = 20;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = 'blue';
	ctx.fillRect(0, 0, 20, 20);
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9));
};

const EMPTY_EXIF: ParsedExif = { date: null, time: null, gps: null, dateTimeOriginal: null };

describe('embedExifMetadata', () => {
	it('bettet Datum und GPS-Position als lesbares EXIF in das JPEG ein', async () => {
		const source = await makeTestJpeg();
		const exif: ParsedExif = {
			date: '2026-03-01',
			time: '14:30',
			gps: { lat: 50.9375, lon: 6.9603 },
			dateTimeOriginal: new Date(2026, 2, 1, 14, 30, 0)
		};

		const result = await embedExifMetadata(source, exif);
		const parsed = await parseExif(result);

		expect(parsed.gps?.lat).toBeCloseTo(50.9375, 3);
		expect(parsed.gps?.lon).toBeCloseTo(6.9603, 3);
		expect(parsed.dateTimeOriginal?.getFullYear()).toBe(2026);
		expect(parsed.dateTimeOriginal?.getMonth()).toBe(2);
		expect(parsed.dateTimeOriginal?.getDate()).toBe(1);
	});

	it('gibt den Blob unverändert zurück, wenn weder Datum noch GPS vorhanden sind', async () => {
		const source = await makeTestJpeg();
		const result = await embedExifMetadata(source, EMPTY_EXIF);
		expect(result).toBe(source);
	});
});
