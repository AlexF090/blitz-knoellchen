/** Akzentfarben, mit denen die Fahrzeug-Karten einer Anzeige visuell unterschieden werden. */
export const VEHICLE_ACCENT_CLASSES = [
	'border-vehicle-1',
	'border-vehicle-2',
	'border-vehicle-3',
	'border-vehicle-4',
	'border-vehicle-5',
	'border-vehicle-6'
] as const;

/** Akzentklasse für ein Fahrzeug an Position `index`; rotiert zyklisch durch die Liste. */
export const getVehicleAccentClass = (index: number): string => {
	const length = VEHICLE_ACCENT_CLASSES.length;
	// Doppeltes Modulo, damit auch negative Indizes in den gültigen Bereich fallen.
	return VEHICLE_ACCENT_CLASSES[((index % length) + length) % length];
};
