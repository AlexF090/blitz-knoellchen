/** Was mit einem neu hinzugefügten Foto geschieht: neues Fahrzeug, erstes Fahrzeug oder nichts. */
export type AutoAssignment = 'create-vehicle' | 'append-first' | 'none';

interface AutoAssignmentContext {
	vehicleCount: number;
	firstVehiclePhotoCount: number;
	maxPhotosPerVehicle: number;
}

/**
 * Entscheidet, ob ein neues Foto automatisch einem Fahrzeug zugeordnet wird. Das geschieht nur,
 * wenn die Zuordnung eindeutig ist (kein oder genau ein Fahrzeug) und das Fahrzeug nicht voll ist.
 */
export const decideAutoAssignment = ({
	vehicleCount,
	firstVehiclePhotoCount,
	maxPhotosPerVehicle
}: AutoAssignmentContext): AutoAssignment => {
	if (vehicleCount === 0) return 'create-vehicle';
	if (vehicleCount === 1 && firstVehiclePhotoCount < maxPhotosPerVehicle) return 'append-first';
	return 'none';
};
