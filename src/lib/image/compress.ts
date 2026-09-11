export interface CompressOptions {
	maxDimension: number;
	quality: number;
}

export const compressImage = async (
	file: Blob,
	{ maxDimension, quality }: CompressOptions
): Promise<Blob> => {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D-Canvas-Kontext konnte nicht erstellt werden.');
	ctx.drawImage(bitmap, 0, 0, width, height);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Bildkompression fehlgeschlagen.'))),
			'image/jpeg',
			quality
		);
	});
};
