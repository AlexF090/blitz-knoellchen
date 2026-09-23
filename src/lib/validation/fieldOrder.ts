import type { FormErrors } from './formSchema';

// Beide Listen folgen der visuellen Reihenfolge des Formulars von oben nach unten und
// entscheiden dadurch, welcher von mehreren gleichzeitigen Fehlern zuerst fokussiert wird.
const PROFILE_FIELD_ORDER: (keyof FormErrors)[] = [
	'firstName',
	'lastName',
	'addressStreet',
	'addressPostcode',
	'addressCity',
	'email'
];

const VEHICLE_FIELD_ORDER: (keyof NonNullable<FormErrors['vehicles']>[number])[] = [
	'photoIds',
	'date',
	'time',
	'endTime',
	'locationStreet',
	'locationPostcode',
	'locationCity',
	'licensePlate',
	'make',
	'color',
	'incidentTypeIds'
];

/** Wohin bei einem Validierungsfehler gescrollt und fokussiert werden soll. */
export type ErrorTarget =
	| { type: 'photos' }
	| { type: 'profileField'; elementId: string }
	// photoIds/incidentTypeIds haben kein einzelnes fokussierbares Eingabefeld (Foto-Grid bzw.
	// Checkbox-Gruppe) — blockElementId ist der Scroll-Fallback, wenn fieldElementId im DOM
	// nicht existiert (der Aufrufer entscheidet das, da nur er das DOM kennt).
	| { type: 'vehicleField'; fieldElementId: string; blockElementId: string };

/** Ermittelt den in der Formularreihenfolge obersten Fehler, oder `null`, wenn es keinen gibt. */
export const findFirstErrorTarget = (
	formErrors: FormErrors,
	vehicleIds: string[]
): ErrorTarget | null => {
	if (formErrors.photos) return { type: 'photos' };

	const profileField = PROFILE_FIELD_ORDER.find((field) => formErrors[field]);
	if (profileField) return { type: 'profileField', elementId: profileField };

	for (const [index, vehicleErrors] of (formErrors.vehicles ?? []).entries()) {
		const field = VEHICLE_FIELD_ORDER.find((f) => vehicleErrors[f]);
		if (!field) continue;
		const vehicleId = vehicleIds[index];
		// Fehlerliste und Fahrzeugliste sind auseinandergelaufen — ohne id lässt sich kein
		// Element adressieren, also lieber gar nicht springen als an die falsche Stelle.
		if (!vehicleId) return null;
		return {
			type: 'vehicleField',
			fieldElementId: `${field}-${vehicleId}`,
			blockElementId: `vehicle-block-${vehicleId}`
		};
	}

	return null;
};
