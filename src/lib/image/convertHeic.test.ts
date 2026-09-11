import { describe, expect, it } from 'vitest';
import { isHeicFile } from './convertHeic';

function makeFile(name: string, type: string): File {
	return new File(['x'], name, { type });
}

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
});
