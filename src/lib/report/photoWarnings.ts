export const PHOTO_WARNINGS = {
	noGps: 'Keine Standortdaten im Foto gefunden — bitte Adresse manuell eingeben.',
	incompleteAddress:
		'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.'
} as const;

// Entfernt Warnungen zu Fahrzeugen, die nicht mehr existieren — ohne diesen Aufruf sammeln sich
// verwaiste Einträge in vehicleGeocodeWarnings an: removeVehicle() entfernt ein Fahrzeug ganz,
// resetVehicle() ersetzt es durch ein neues mit frischer UUID, in beiden Fällen bleibt die alte
// id sonst für immer als Karteileiche in diesem Objekt stehen.
export const pruneWarnings = (
	warnings: Record<string, string>,
	vehicles: { id: string }[]
): Record<string, string> => {
	const validIds = new Set(vehicles.map((vehicle) => vehicle.id));
	return Object.fromEntries(Object.entries(warnings).filter(([id]) => validIds.has(id)));
};
