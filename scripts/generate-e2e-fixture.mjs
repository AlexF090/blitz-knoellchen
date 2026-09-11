// Einmaliges Setup-Skript: erzeugt eine echte, browser-dekodierbare JPEG-Datei mit
// EXIF-GPS + DateTimeOriginal für den Playwright-Happy-Path (kein Foto-Editing-Paket
// nötig — die JPEG-Bytes kommen aus einem echten <canvas>.toBlob via Playwright,
// das ohnehin schon als Dependency installiert ist; der EXIF-APP1-Block wird von Hand
// nach der gut dokumentierten TIFF/EXIF-Struktur zusammengesetzt).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const u16 = (n) => {
	const b = Buffer.alloc(2);
	b.writeUInt16BE(n, 0);
	return b;
};
const u32 = (n) => {
	const b = Buffer.alloc(4);
	b.writeUInt32BE(n, 0);
	return b;
};
const ascii = (str) => {
	return Buffer.from(str, 'ascii');
};
const ifdEntry = (tag, type, count, valueOrOffset) => {
	return Buffer.concat([u16(tag), u16(type), u32(count), u32(valueOrOffset)]);
};
const rational = (num, den) => {
	return Buffer.concat([u32(num), u32(den)]);
};

const buildExifApp1 = ({ lat, lon, dateTimeOriginal }) => {
	// Layout-Offsets sind relativ zum TIFF-Header-Start (direkt nach "Exif\0\0").
	const IFD0_OFFSET = 8;
	const EXIF_IFD_OFFSET = 38;
	const DATE_STRING_OFFSET = 56;
	const GPS_IFD_OFFSET = 76;
	const GPS_LAT_OFFSET = 130;
	const GPS_LON_OFFSET = 154;

	const tiffHeader = Buffer.concat([ascii('MM'), u16(42), u32(IFD0_OFFSET)]);

	const ifd0 = Buffer.concat([
		u16(2),
		ifdEntry(0x8769, 4, 1, EXIF_IFD_OFFSET), // Exif SubIFD pointer
		ifdEntry(0x8825, 4, 1, GPS_IFD_OFFSET), // GPS IFD pointer
		u32(0)
	]);

	const dateString = ascii(dateTimeOriginal + '\0'); // 20 Bytes ("YYYY:MM:DD HH:MM:SS\0")
	const exifIfd = Buffer.concat([
		u16(1),
		ifdEntry(0x9003, 2, dateString.length, DATE_STRING_OFFSET), // DateTimeOriginal
		u32(0)
	]);

	const toDMS = (value) => {
		const deg = Math.floor(value);
		const minFloat = (value - deg) * 60;
		const min = Math.floor(minFloat);
		const sec = Math.round((minFloat - min) * 60 * 100); // Hundertstel-Sekunden
		return [rational(deg, 1), rational(min, 1), rational(sec, 100)];
	};

	const latDms = Buffer.concat(toDMS(Math.abs(lat)));
	const lonDms = Buffer.concat(toDMS(Math.abs(lon)));

	const gpsIfd = Buffer.concat([
		u16(4),
		ifdEntry(
			0x0001,
			2,
			2,
			Buffer.concat([ascii(lat >= 0 ? 'N' : 'S'), Buffer.from([0, 0, 0])]).readUInt32BE(0)
		),
		ifdEntry(0x0002, 5, 3, GPS_LAT_OFFSET),
		ifdEntry(
			0x0003,
			2,
			2,
			Buffer.concat([ascii(lon >= 0 ? 'E' : 'W'), Buffer.from([0, 0, 0])]).readUInt32BE(0)
		),
		ifdEntry(0x0004, 5, 3, GPS_LON_OFFSET),
		u32(0)
	]);

	const tiff = Buffer.concat([tiffHeader, ifd0, exifIfd, dateString, gpsIfd, latDms, lonDms]);
	const segmentContent = Buffer.concat([ascii('Exif\0\0'), tiff]);
	const length = segmentContent.length + 2;

	return Buffer.concat([Buffer.from([0xff, 0xe1]), u16(length), segmentContent]);
};

const makeBaseJpeg = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	const base64 = await page.evaluate(async () => {
		const canvas = document.createElement('canvas');
		canvas.width = 600;
		canvas.height = 400;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#1d4ed8';
		ctx.fillRect(0, 0, 600, 400);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(200, 130, 200, 140);
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
		const buffer = await blob.arrayBuffer();
		return btoa(String.fromCharCode(...new Uint8Array(buffer)));
	});
	await browser.close();
	return Buffer.from(base64, 'base64');
};

const insertApp1 = (jpeg, app1) => {
	// APP1 direkt nach dem SOI-Marker (FF D8) einfügen.
	if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('Kein gültiges JPEG (SOI fehlt).');
	return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
};

const baseJpeg = await makeBaseJpeg();
const app1 = buildExifApp1({
	lat: 50.9375,
	lon: 6.9603,
	dateTimeOriginal: '2026:03:01 14:30:00'
});
const withExif = insertApp1(baseJpeg, app1);

mkdirSync('e2e/fixtures', { recursive: true });
writeFileSync('e2e/fixtures/photo-with-gps.jpg', withExif);
console.log('Fixture geschrieben: e2e/fixtures/photo-with-gps.jpg');
