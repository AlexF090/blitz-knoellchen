import { describe, expect, it } from 'vitest';
import { appendCoordinatesNote } from './appendCoordinatesNote';

const gps = { lat: 50.9375, lon: 6.9603 };

describe('appendCoordinatesNote', () => {
	it('legt die Koordinaten-Zeile bei leeren Notizen an', () => {
		expect(appendCoordinatesNote(undefined, gps)).toBe(
			'GPS-Koordinaten des Fotos: 50.9375, 6.9603'
		);
		expect(appendCoordinatesNote('', gps)).toBe('GPS-Koordinaten des Fotos: 50.9375, 6.9603');
	});

	it('hängt die Zeile an vorhandene Notizen an', () => {
		expect(appendCoordinatesNote('Motor lief', gps)).toBe(
			'Motor lief\nGPS-Koordinaten des Fotos: 50.9375, 6.9603'
		);
	});

	it('lässt Notizen mit vorhandener Koordinaten-Zeile unverändert', () => {
		const notes = 'Motor lief\nGPS-Koordinaten des Fotos: 1, 2';
		expect(appendCoordinatesNote(notes, gps)).toBe(notes);
	});
});
