export function isHeicFile(file: Blob & { name?: string }): boolean {
	const type = file.type.toLowerCase();
	if (type === 'image/heic' || type === 'image/heif') return true;
	// iOS liefert für HEIC-Fotos manchmal einen leeren/generischen MIME-Type,
	// daher zusätzlich anhand der Dateiendung erkennen.
	const name = 'name' in file ? (file.name ?? '') : '';
	return /\.hei[cf]$/i.test(name);
}

export async function convertHeicToJpeg(file: Blob): Promise<Blob> {
	const heic2any = (await import('heic2any')).default;
	const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
	return Array.isArray(result) ? result[0] : result;
}
