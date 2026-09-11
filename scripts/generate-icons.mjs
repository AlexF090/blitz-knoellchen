// Einmaliges Setup-Skript: erzeugt einfache PNG-Platzhalter-Icons ohne zusätzliche
// Bildbearbeitungs-Dependency (nur Node-Bordmittel: zlib für PNG-Kompression).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const makeTable = () => {
	const table = new Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
};

const crc32 = (buf) => {
	let c;
	const table = crc32.table ?? (crc32.table = makeTable());
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		c = table[(crc ^ buf[i]) & 0xff];
		crc = (crc >>> 8) ^ c;
	}
	return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
	const typeBuf = Buffer.from(type, 'ascii');
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32BE(data.length, 0);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
};

// Zeichnet ein abgerundetes "K" auf blauem Grund, Padding proportional zur Größe
// (maskable Icons brauchen sichere Zone in der Mitte ~80% der Fläche).
const drawIcon = (size, { maskable = false } = {}) => {
	const bg = [0x1d, 0x4e, 0xd8]; // Tailwind blue-700-ish
	const fg = [0xff, 0xff, 0xff];
	const pixels = Buffer.alloc(size * size * 4);
	const pad = maskable ? Math.round(size * 0.15) : 0;

	// Balken-"K"-Form, grob approximiert per Streifen.
	const barW = Math.max(2, Math.round(size * 0.12));
	const cx = size / 2;
	const cy = size / 2;
	const half = size / 2 - pad;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const idx = (y * size + x) * 4;
			const inSafe = x >= pad && x < size - pad && y >= pad && y < size - pad;
			let isFg = false;
			if (inSafe) {
				const dx = x - (cx - half * 0.4);
				const dy = y - cy;
				// vertikaler Balken
				if (x >= cx - half * 0.5 && x < cx - half * 0.5 + barW) isFg = true;
				// zwei diagonale Balken für die "K"-Form
				const diag1 = Math.abs(dx - dy * 0.6);
				const diag2 = Math.abs(dx + dy * 0.6);
				if (dy <= 0 && diag1 < barW * 0.7 && x > cx - half * 0.5) isFg = true;
				if (dy >= 0 && diag2 < barW * 0.7 && x > cx - half * 0.5) isFg = true;
			}
			const color = isFg ? fg : bg;
			pixels[idx] = color[0];
			pixels[idx + 1] = color[1];
			pixels[idx + 2] = color[2];
			pixels[idx + 3] = 255;
		}
	}

	const rowSize = size * 4 + 1;
	const raw = Buffer.alloc(rowSize * size);
	for (let y = 0; y < size; y++) {
		raw[y * rowSize] = 0; // filter type none
		pixels.copy(raw, y * rowSize + 1, y * size * 4, (y + 1) * size * 4);
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const idat = deflateSync(raw);
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	return Buffer.concat([
		signature,
		chunk('IHDR', ihdr),
		chunk('IDAT', idat),
		chunk('IEND', Buffer.alloc(0))
	]);
};

writeFileSync('static/icons/icon-192.png', drawIcon(192));
writeFileSync('static/icons/icon-512.png', drawIcon(512));
writeFileSync('static/icons/icon-maskable-512.png', drawIcon(512, { maskable: true }));

console.log('Icons generiert: static/icons/icon-192.png, icon-512.png, icon-maskable-512.png');
