import ExifReader from 'exifreader';

export interface ParsedExif {
	date: string | null;
	time: string | null;
	gps: { lat: number; lon: number } | null;
	dateTimeOriginal: Date | null;
}

const EMPTY: ParsedExif = { date: null, time: null, gps: null, dateTimeOriginal: null };

const parseExifDateTime = (value: string): Date | null => {
	const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(value);
	if (!match) return null;
	const [, year, month, day, hour, minute, second] = match.map(Number);
	const date = new Date(year, month - 1, day, hour, minute, second);
	return isNaN(date.getTime()) ? null : date;
};

export const parseExif = async (file: Blob): Promise<ParsedExif> => {
	try {
		const buffer = await file.arrayBuffer();
		const tags = await ExifReader.load(buffer, { expanded: true });

		let date: string | null = null;
		let time: string | null = null;
		let dateTimeOriginal: Date | null = null;
		const rawDateTimeOriginal = tags.exif?.DateTimeOriginal?.description;
		if (rawDateTimeOriginal) {
			const parsed = parseExifDateTime(rawDateTimeOriginal);
			if (parsed) {
				date = parsed.toISOString().slice(0, 10);
				time = parsed.toTimeString().slice(0, 5);
				dateTimeOriginal = parsed;
			}
		}

		const gps =
			typeof tags.gps?.Latitude === 'number' && typeof tags.gps?.Longitude === 'number'
				? { lat: tags.gps.Latitude, lon: tags.gps.Longitude }
				: null;

		return { date, time, gps, dateTimeOriginal };
	} catch {
		return EMPTY;
	}
};
