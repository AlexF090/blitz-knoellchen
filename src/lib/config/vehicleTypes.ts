/** Geschlossene Auswahl der Fahrzeugarten, wie vom Original-Formular der Stadt Köln vorgegeben. */
// Bewusst kein Freitext/keine Datalist — die Bußgeldstelle erwartet hier eine feste Auswahl
// (anders als bei der Marke, s. vehicleMakes.ts).
export const VEHICLE_TYPES = [
	'PKW',
	'LKW',
	'LKW mit Anhänger',
	'Motorrad',
	'Bus',
	'Anhänger ohne Zugfahrzeug',
	'Sonstiges'
] as const;

/** Eine der in VEHICLE_TYPES zugelassenen Fahrzeugarten. */
export type VehicleType = (typeof VEHICLE_TYPES)[number];
