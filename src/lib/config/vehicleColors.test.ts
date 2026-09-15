import { describe, expect, it } from 'vitest';
import { VEHICLE_ACCENT_CLASSES, getVehicleAccentClass } from './vehicleColors';

describe('getVehicleAccentClass', () => {
	it('gibt die erste Klasse für Index 0 zurück', () => {
		expect(getVehicleAccentClass(0)).toBe(VEHICLE_ACCENT_CLASSES[0]);
	});

	it('rotiert für Indizes größer als die Klassenanzahl', () => {
		expect(getVehicleAccentClass(VEHICLE_ACCENT_CLASSES.length)).toBe(VEHICLE_ACCENT_CLASSES[0]);
	});

	it('liefert für negative Indizes dieselbe Klasse wie den entsprechenden positiven Index (Bug-Fix)', () => {
		const length = VEHICLE_ACCENT_CLASSES.length;
		expect(getVehicleAccentClass(-1)).toBe(getVehicleAccentClass(length - 1));
		expect(getVehicleAccentClass(-1)).toBeDefined();
	});

	it('liefert für -length wieder die erste Klasse', () => {
		expect(getVehicleAccentClass(-VEHICLE_ACCENT_CLASSES.length)).toBe(VEHICLE_ACCENT_CLASSES[0]);
	});
});
