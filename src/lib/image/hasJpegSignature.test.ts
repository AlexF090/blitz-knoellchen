import { describe, expect, it } from 'vitest';
import { hasJpegSignature } from './hasJpegSignature';

describe('hasJpegSignature', () => {
	it('erkennt ein JPEG an FF D8 FF', () => {
		expect(hasJpegSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
	});

	it('lehnt eine PNG-Signatur ab', () => {
		expect(hasJpegSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
	});

	it('lehnt zu kurze Daten ab', () => {
		expect(hasJpegSignature(new Uint8Array([0xff, 0xd8]))).toBe(false);
	});
});
