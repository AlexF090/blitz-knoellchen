/** Erkennt HEIC/HEIF-Dateien an MIME-Type oder Dateiendung. */
export const isHeicFile = (file: Blob & { name?: string }): boolean => {
	const type = file.type.toLowerCase();
	if (type === 'image/heic' || type === 'image/heif') return true;
	// iOS liefert für HEIC-Fotos manchmal einen leeren/generischen MIME-Type.
	const name = 'name' in file ? (file.name ?? '') : '';
	return /\.hei[cf]$/i.test(name);
};

/** Konvertiert ein HEIC/HEIF-Bild in ein JPEG. */
export const convertHeicToJpeg = async (file: Blob): Promise<Blob> => {
	const { heicTo } = await import('heic-to/csp');
	return heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
};
