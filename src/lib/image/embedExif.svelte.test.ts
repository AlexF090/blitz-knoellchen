import { parseExif, type ParsedExif } from '$lib/exif/parseExif';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('bettet nur die GPS-Position ein, wenn kein Aufnahmedatum vorhanden ist (auch mit südlichen/westlichen Koordinaten)', async () => {
		const source = await makeTestJpeg();
		const exif: ParsedExif = {
			date: null,
			time: null,
			gps: { lat: -33.8688, lon: -18.4241 },
			dateTimeOriginal: null
		};

		const result = await embedExifMetadata(source, exif);
		const parsed = await parseExif(result);

		expect(parsed.gps?.lat).toBeCloseTo(-33.8688, 2);
		expect(parsed.gps?.lon).toBeCloseTo(-18.4241, 2);
	});

	it('gibt den Original-Blob zurück, wenn das Lesen des Blobs fehlschlägt', async () => {
		vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
			this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
		});
		const source = await makeTestJpeg();
		const exif: ParsedExif = {
			date: '2026-03-01',
			time: '14:30',
			gps: null,
			dateTimeOriginal: new Date(2026, 2, 1, 14, 30, 0)
		};

		const result = await embedExifMetadata(source, exif);

		expect(result).toBe(source);
	});

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

	it('bettet EXIF ohne fetch ein, weil die CSP data:-URLs in connect-src blockiert', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValue(new TypeError('Refused to connect (CSP)'));
		const source = await makeTestJpeg();
		const exif: ParsedExif = {
			date: null,
			time: null,
			gps: { lat: 50.9375, lon: 6.9603 },
			dateTimeOriginal: null
		};

		const result = await embedExifMetadata(source, exif);
		const parsed = await parseExif(result);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result.type).toBe('image/jpeg');
		expect(parsed.gps?.lat).toBeCloseTo(50.9375, 3);
	});

	it('gibt den Blob unverändert zurück, wenn weder Datum noch GPS vorhanden sind', async () => {
		const source = await makeTestJpeg();
		const result = await embedExifMetadata(source, EMPTY_EXIF);
		expect(result).toBe(source);
	});

	it('gibt den Original-Blob zurück, wenn das Einbetten fehlschlägt (kein gültiges JPEG)', async () => {
		const invalidJpeg = new Blob(['not a real jpeg'], { type: 'image/jpeg' });
		const exif: ParsedExif = {
			date: '2026-03-01',
			time: '14:30',
			gps: null,
			dateTimeOriginal: new Date(2026, 2, 1, 14, 30, 0)
		};

		const result = await embedExifMetadata(invalidJpeg, exif);

		expect(result).toBe(invalidJpeg);
	});
});
