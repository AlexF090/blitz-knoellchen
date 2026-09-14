import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseExifMock = vi.fn();
const compressImageMock = vi.fn();
const convertHeicToJpegMock = vi.fn();
const embedExifMetadataMock = vi.fn();

vi.mock('$lib/exif/parseExif', () => ({
	parseExif: (...args: unknown[]) => parseExifMock(...args)
}));
vi.mock('$lib/image/compress', () => ({
	compressImage: (...args: unknown[]) => compressImageMock(...args)
}));
vi.mock('$lib/image/convertHeic', async () => {
	const actual =
		await vi.importActual<typeof import('$lib/image/convertHeic')>('$lib/image/convertHeic');
	return {
		...actual,
		convertHeicToJpeg: (...args: unknown[]) => convertHeicToJpegMock(...args)
	};
});
vi.mock('$lib/image/embedExif', () => ({
	embedExifMetadata: (...args: unknown[]) => embedExifMetadataMock(...args)
}));

const { createPhotoEntry, HeicConversionError } = await import('./createPhotoEntry');

const jpegFile = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
const heicFile = new File(['x'], 'foto.heic', { type: 'image/heic' });
const exif = { date: '2026-03-01', time: '12:00', gps: { lat: 1, lon: 2 }, dateTimeOriginal: null };

describe('createPhotoEntry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('compresses and embeds EXIF for a non-HEIC file', async () => {
		parseExifMock.mockResolvedValue(exif);
		compressImageMock.mockResolvedValue(new Blob(['compressed']));
		embedExifMetadataMock.mockResolvedValue(new Blob(['final']));

		const entry = await createPhotoEntry(jpegFile);

		expect(convertHeicToJpegMock).not.toHaveBeenCalled();
		expect(compressImageMock).toHaveBeenCalledWith(jpegFile, { maxDimension: 1600, quality: 0.8 });
		expect(entry.fileName).toBe('foto.jpg');
		expect(entry.date).toBe('2026-03-01');
		expect(entry.gps).toEqual({ lat: 1, lon: 2 });
		expect(entry.id).toBeTruthy();
	});

	it('converts HEIC files before compressing', async () => {
		parseExifMock.mockResolvedValue(exif);
		const converted = new Blob(['converted']);
		convertHeicToJpegMock.mockResolvedValue(converted);
		compressImageMock.mockResolvedValue(new Blob(['compressed']));
		embedExifMetadataMock.mockResolvedValue(new Blob(['final']));

		await createPhotoEntry(heicFile);

		expect(convertHeicToJpegMock).toHaveBeenCalledWith(heicFile);
		expect(compressImageMock).toHaveBeenCalledWith(converted, { maxDimension: 1600, quality: 0.8 });
	});

	it('throws HeicConversionError when HEIC conversion fails', async () => {
		parseExifMock.mockResolvedValue(exif);
		convertHeicToJpegMock.mockRejectedValue(new Error('heif_error_Invalid_input'));

		await expect(createPhotoEntry(heicFile)).rejects.toBeInstanceOf(HeicConversionError);
		expect(compressImageMock).not.toHaveBeenCalled();
	});
});
