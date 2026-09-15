import { describe, expect, it, vi } from 'vitest';
import { compressImage } from './compress';

const makeTestBlob = (width: number, height: number): Promise<Blob> => {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = 'red';
	ctx.fillRect(0, 0, width, height);
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
};

describe('compressImage', () => {
	it('verkleinert ein Bild auf die maximale Dimension', async () => {
		const source = await makeTestBlob(800, 600);
		const result = await compressImage(source, { maxDimension: 400, quality: 0.8 });
		const bitmap = await createImageBitmap(result);
		expect(bitmap.width).toBe(400);
		expect(bitmap.height).toBe(300);
		expect(result.type).toBe('image/jpeg');
	});

	it('vergrößert kleine Bilder nicht', async () => {
		const source = await makeTestBlob(100, 100);
		const result = await compressImage(source, { maxDimension: 400, quality: 0.8 });
		const bitmap = await createImageBitmap(result);
		expect(bitmap.width).toBe(100);
		expect(bitmap.height).toBe(100);
	});

	it('wirft, wenn kein 2D-Canvas-Kontext erstellt werden kann', async () => {
		const source = await makeTestBlob(100, 100);
		const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

		await expect(compressImage(source, { maxDimension: 400, quality: 0.8 })).rejects.toThrow(
			'2D-Canvas-Kontext konnte nicht erstellt werden.'
		);

		getContextSpy.mockRestore();
	});

	it('lehnt ab, wenn die Kompression keinen Blob liefert', async () => {
		const source = await makeTestBlob(100, 100);
		const toBlobSpy = vi
			.spyOn(HTMLCanvasElement.prototype, 'toBlob')
			.mockImplementation((callback) => callback(null));

		await expect(compressImage(source, { maxDimension: 400, quality: 0.8 })).rejects.toThrow(
			'Bildkompression fehlgeschlagen.'
		);

		toBlobSpy.mockRestore();
	});
});
