import exifr from 'exifr';

export interface ParsedExif {
	date: string | null;
	time: string | null;
	gps: { lat: number; lon: number } | null;
}

const EMPTY: ParsedExif = { date: null, time: null, gps: null };

export async function parseExif(file: Blob): Promise<ParsedExif> {
	try {
		const data = await exifr.parse(file, { gps: true });
		if (!data) return EMPTY;

		let date: string | null = null;
		let time: string | null = null;
		const dateTimeOriginal = data.DateTimeOriginal;
		if (dateTimeOriginal instanceof Date && !isNaN(dateTimeOriginal.getTime())) {
			date = dateTimeOriginal.toISOString().slice(0, 10);
			time = dateTimeOriginal.toTimeString().slice(0, 5);
		}

		const gps =
			typeof data.latitude === 'number' && typeof data.longitude === 'number'
				? { lat: data.latitude, lon: data.longitude }
				: null;

		return { date, time, gps };
	} catch {
		return EMPTY;
	}
}
