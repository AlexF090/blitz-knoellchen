// Feste Fahrzeugart-Liste, wie im Original-Formular der Bußgeldstelle Köln vorgegeben —
// bewusst kein Freitext/keine Datalist, da die Bußgeldstelle hier eine geschlossene Auswahl
// erwartet (anders als bei Marke, s. vehicleMakes.ts).
export const VEHICLE_TYPES = [
	'PKW',
	'LKW',
	'LKW mit Anhänger',
	'Motorrad',
	'Bus',
	'Anhänger ohne Zugfahrzeug',
	'Sonstiges'
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
