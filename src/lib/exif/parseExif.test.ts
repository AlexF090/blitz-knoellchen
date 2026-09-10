import { describe, expect, it, vi } from 'vitest';
import exifr from 'exifr';
import { parseExif } from './parseExif';

vi.mock('exifr', () => ({
	default: { parse: vi.fn() }
}));

const mockedParse = vi.mocked(exifr.parse);

describe('parseExif', () => {
	it('liefert Datum, Uhrzeit und GPS wenn vorhanden', async () => {
		mockedParse.mockResolvedValue({
			DateTimeOriginal: new Date('2026-03-01T14:30:00Z'),
			latitude: 50.9375,
			longitude: 6.9603
		});

		const result = await parseExif(new Blob());
		expect(result.date).toBe('2026-03-01');
		expect(result.gps).toEqual({ lat: 50.9375, lon: 6.9603 });
	});

	it('liefert kein GPS, wenn EXIF-Tag fehlt', async () => {
		mockedParse.mockResolvedValue({ DateTimeOriginal: new Date('2026-03-01T14:30:00Z') });

		const result = await parseExif(new Blob());
		expect(result.gps).toBeNull();
		expect(result.date).toBe('2026-03-01');
	});

	it('liefert kein Datum, wenn EXIF-Tag fehlt', async () => {
		mockedParse.mockResolvedValue({ latitude: 50.9375, longitude: 6.9603 });

		const result = await parseExif(new Blob());
		expect(result.date).toBeNull();
		expect(result.gps).toEqual({ lat: 50.9375, lon: 6.9603 });
	});

	it('wirft nicht bei korrupten Daten, liefert leeres Ergebnis', async () => {
		mockedParse.mockRejectedValue(new Error('corrupt'));

		const result = await parseExif(new Blob());
		expect(result).toEqual({ date: null, time: null, gps: null });
	});
});
