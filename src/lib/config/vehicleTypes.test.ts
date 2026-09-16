import { describe, expect, it } from 'vitest';
import { VEHICLE_TYPES } from './vehicleTypes';

describe('VEHICLE_TYPES', () => {
	it('enthält nur eindeutige, nicht-leere Einträge', () => {
		expect(new Set(VEHICLE_TYPES).size).toBe(VEHICLE_TYPES.length);
		expect(VEHICLE_TYPES.every((type) => type.trim().length > 0)).toBe(true);
	});

	it('enthält "Sonstiges" als Fallback-Option', () => {
		expect(VEHICLE_TYPES).toContain('Sonstiges');
	});
});
