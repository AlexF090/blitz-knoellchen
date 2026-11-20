import { describe, expect, it } from 'vitest';
import { decideAutoAssignment } from './autoAssign';

describe('decideAutoAssignment', () => {
	it('legt das erste Fahrzeug an, wenn noch keines existiert', () => {
		expect(
			decideAutoAssignment({ vehicleCount: 0, firstVehiclePhotoCount: 0, maxPhotosPerVehicle: 3 })
		).toBe('create-vehicle');
	});

	it('hängt das Foto an das einzige Fahrzeug, solange es Platz hat', () => {
		expect(
			decideAutoAssignment({ vehicleCount: 1, firstVehiclePhotoCount: 2, maxPhotosPerVehicle: 3 })
		).toBe('append-first');
	});

	it('lässt das Foto unzugeordnet, wenn das einzige Fahrzeug voll ist', () => {
		expect(
			decideAutoAssignment({ vehicleCount: 1, firstVehiclePhotoCount: 3, maxPhotosPerVehicle: 3 })
		).toBe('none');
	});

	it('ordnet bei mehreren Fahrzeugen nie automatisch zu', () => {
		expect(
			decideAutoAssignment({ vehicleCount: 2, firstVehiclePhotoCount: 0, maxPhotosPerVehicle: 3 })
		).toBe('none');
	});
});
