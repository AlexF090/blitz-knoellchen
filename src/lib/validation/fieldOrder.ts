import type { FormErrors } from './formSchema';

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

export type ErrorTarget =
	| { type: 'photos' }
	| { type: 'profileField'; elementId: string }
	// photoIds/incidentTypeIds haben kein einzelnes fokussierbares Eingabefeld (Foto-Grid bzw.
	// Checkbox-Gruppe) — blockElementId ist der Scroll-Fallback, wenn fieldElementId im DOM
	// nicht existiert (der Aufrufer entscheidet das, da nur er das DOM kennt).
	| { type: 'vehicleField'; fieldElementId: string; blockElementId: string };

// Welches Feld bei mehreren gleichzeitigen Fehlern zuerst fokussiert wird — folgt der
// visuellen Reihenfolge des Formulars von oben nach unten.
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
		if (!vehicleId) return null;
		return {
			type: 'vehicleField',
			fieldElementId: `${field}-${vehicleId}`,
			blockElementId: `vehicle-block-${vehicleId}`
		};
	}

	return null;
};
