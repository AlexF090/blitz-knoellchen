const COORDINATES_NOTE_PREFIX = 'GPS-Koordinaten des Fotos:';

/**
 * Hängt die GPS-Koordinaten eines Fotos als eigene Zeile an die Notizen an. Steht schon eine
 * Koordinaten-Zeile darin, bleiben die Notizen unverändert.
 */
// Eine Zeile reicht der Behörde zur Ortung; jedes weitere Foto desselben Fahrzeugs würde sonst
// eine nahezu gleiche Zeile anhängen.
export const appendCoordinatesNote = (
	notes: string | undefined,
	gps: { lat: number; lon: number }
): string => {
	if (notes?.includes(COORDINATES_NOTE_PREFIX)) return notes;
	const coordinatesNote = `${COORDINATES_NOTE_PREFIX} ${gps.lat}, ${gps.lon}`;
	return notes ? `${notes}\n${coordinatesNote}` : coordinatesNote;
};
