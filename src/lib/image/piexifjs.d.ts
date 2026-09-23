// piexifjs bringt keine eigenen Typen mit — deklariert ist nur der in embedExif.ts tatsächlich
// genutzte Ausschnitt der API, nicht der volle Funktionsumfang.
declare module 'piexifjs' {
	type Rational = [number, number];
	type ExifDict = Record<string, Record<number, string | number | Rational[]>>;

	interface Piexif {
		GPSIFD: {
			GPSLatitudeRef: number;
			GPSLatitude: number;
			GPSLongitudeRef: number;
			GPSLongitude: number;
		};
		ExifIFD: {
			DateTimeOriginal: number;
		};
		ImageIFD: {
			DateTime: number;
		};
		GPSHelper: {
			degToDmsRational(degFloat: number): Rational[];
		};
		dump(exifObj: ExifDict): string;
		insert(exifBytes: string, jpegDataUrl: string): string;
	}

	const piexif: Piexif;
	export default piexif;
}
