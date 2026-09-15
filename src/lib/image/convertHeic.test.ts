import { describe, expect, it, vi } from 'vitest';
import { convertHeicToJpeg, isHeicFile } from './convertHeic';

const makeFile = (name: string, type: string): File => {
	return new File(['x'], name, { type });
};

const heicToMock = vi.fn();
vi.mock('heic-to/csp', () => ({
	heicTo: (...args: unknown[]) => heicToMock(...args)
}));

describe('isHeicFile', () => {
	it('erkennt image/heic MIME-Type', () => {
		expect(isHeicFile(makeFile('foto.heic', 'image/heic'))).toBe(true);
	});

	it('erkennt image/heif MIME-Type', () => {
		expect(isHeicFile(makeFile('foto.heif', 'image/heif'))).toBe(true);
	});

	it('erkennt HEIC anhand der Dateiendung, wenn der MIME-Type fehlt', () => {
		expect(isHeicFile(makeFile('IMG_5061.HEIC', ''))).toBe(true);
	});

	it('erkennt JPEG nicht als HEIC', () => {
		expect(isHeicFile(makeFile('foto.jpg', 'image/jpeg'))).toBe(false);
	});

	it('erkennt kein HEIC bei einem Blob ohne name-Eigenschaft', () => {
		const blob = new Blob(['x'], { type: '' }) as Blob & { name?: string };
		expect(isHeicFile(blob)).toBe(false);
	});

	it('erkennt kein HEIC, wenn name als Eigenschaft vorhanden, aber undefined ist', () => {
		const blob = Object.assign(new Blob(['x'], { type: '' }), { name: undefined }) as Blob & {
			name?: string;
		};
		expect(isHeicFile(blob)).toBe(false);
	});
});

describe('convertHeicToJpeg', () => {
	it('konvertiert eine HEIC-Datei zu JPEG über heic-to', async () => {
		const jpegBlob = new Blob(['jpeg-data'], { type: 'image/jpeg' });
		heicToMock.mockResolvedValue(jpegBlob);
		const source = makeFile('foto.heic', 'image/heic');

		const result = await convertHeicToJpeg(source);

		expect(heicToMock).toHaveBeenCalledWith({ blob: source, type: 'image/jpeg', quality: 0.9 });
		expect(result).toBe(jpegBlob);
	});
});
