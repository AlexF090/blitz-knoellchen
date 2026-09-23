/** Hinweistexte, wenn sich der Tatort nicht vollständig aus dem Foto ableiten ließ. */
export const PHOTO_WARNINGS = {
	noGps: 'Keine Standortdaten im Foto gefunden — bitte Adresse manuell eingeben.',
	incompleteAddress:
		'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.'
} as const;

/** Entfernt Warnungen zu Fahrzeugen, die es nicht mehr gibt. */
// Ohne diesen Aufruf sammeln sich verwaiste Einträge an: removeVehicle() entfernt ein Fahrzeug
// ganz, resetVehicle() ersetzt es durch ein neues mit frischer UUID — in beiden Fällen bliebe
// die alte id für immer als Karteileiche stehen.
export const pruneWarnings = (
	warnings: Record<string, string>,
	vehicles: { id: string }[]
): Record<string, string> => {
	const validIds = new Set(vehicles.map((vehicle) => vehicle.id));
	return Object.fromEntries(Object.entries(warnings).filter(([id]) => validIds.has(id)));
};
