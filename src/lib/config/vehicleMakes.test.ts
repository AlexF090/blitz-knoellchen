import { describe, expect, it } from 'vitest';
import { VEHICLE_MAKES } from './vehicleMakes';

describe('VEHICLE_MAKES', () => {
	it('enthält "Unbekannt" als ersten Eintrag', () => {
		expect(VEHICLE_MAKES[0]).toBe('Unbekannt');
	});

	it('enthält nur eindeutige, nicht-leere Einträge', () => {
		expect(new Set(VEHICLE_MAKES).size).toBe(VEHICLE_MAKES.length);
		expect(VEHICLE_MAKES.every((make) => make.trim().length > 0)).toBe(true);
	});
});
