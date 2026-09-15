import { describe, expect, it, vi, type Mock } from 'vitest';
import ExifReader, { type ExpandedTags } from 'exifreader';
import { parseExif } from './parseExif';

vi.mock('exifreader', () => ({
	default: { load: vi.fn() }
}));

// `load` ist stark überladen (sync/async, unterschiedliche Input-Typen); vi.mocked() greift
// dabei die falsche Überladung. Direkter Cast auf Mock statt inferierter Signatur.
const mockedLoad = ExifReader.load as unknown as Mock<
	(...args: unknown[]) => Promise<ExpandedTags>
>;

describe('parseExif', () => {
	it('liefert Datum, Uhrzeit und GPS wenn vorhanden', async () => {
		mockedLoad.mockResolvedValue({
			exif: { DateTimeOriginal: { id: 0, description: '2026:03:01 14:30:00', value: [] } },
			gps: { Latitude: 50.9375, Longitude: 6.9603 }
		});

		const result = await parseExif(new Blob());
		expect(result.date).toBe('2026-03-01');
		expect(result.time).toBe('14:30');
		expect(result.gps).toEqual({ lat: 50.9375, lon: 6.9603 });
		expect(result.dateTimeOriginal).toEqual(new Date(2026, 2, 1, 14, 30, 0));
	});

	it('liefert kein GPS, wenn EXIF-Tag fehlt', async () => {
		mockedLoad.mockResolvedValue({
			exif: { DateTimeOriginal: { id: 0, description: '2026:03:01 14:30:00', value: [] } }
		});

		const result = await parseExif(new Blob());
		expect(result.gps).toBeNull();
		expect(result.date).toBe('2026-03-01');
	});

	it('liefert kein Datum, wenn EXIF-Tag fehlt', async () => {
		mockedLoad.mockResolvedValue({ gps: { Latitude: 50.9375, Longitude: 6.9603 } });

		const result = await parseExif(new Blob());
		expect(result.date).toBeNull();
		expect(result.gps).toEqual({ lat: 50.9375, lon: 6.9603 });
	});

	it('liefert kein Datum, wenn der EXIF-Zeitstempel nicht dem erwarteten Format entspricht', async () => {
		mockedLoad.mockResolvedValue({
			exif: { DateTimeOriginal: { id: 0, description: 'kein-datum', value: [] } }
		});

		const result = await parseExif(new Blob());
		expect(result.date).toBeNull();
		expect(result.time).toBeNull();
		expect(result.dateTimeOriginal).toBeNull();
	});

	it('wirft nicht bei korrupten Daten, liefert leeres Ergebnis', async () => {
		mockedLoad.mockRejectedValue(new Error('corrupt'));

		const result = await parseExif(new Blob());
		expect(result).toEqual({ date: null, time: null, gps: null, dateTimeOriginal: null });
	});
});
