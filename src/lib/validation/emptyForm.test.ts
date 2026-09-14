import { describe, expect, it } from 'vitest';
import { createEmptyForm, createEmptyVehicle } from './emptyForm';

describe('createEmptyVehicle', () => {
	it('generates a random id when none is given', () => {
		const a = createEmptyVehicle();
		const b = createEmptyVehicle();
		expect(a.id).not.toBe(b.id);
	});

	it('uses the given id when provided', () => {
		expect(createEmptyVehicle('fixed-id').id).toBe('fixed-id');
	});

	it('defaults timeMode to halteverstoss and licensePlateCountry to D', () => {
		const vehicle = createEmptyVehicle('id');
		expect(vehicle.timeMode).toBe('halteverstoss');
		expect(vehicle.licensePlateCountry).toBe('D');
		expect(vehicle.endTime).toBeUndefined();
	});
});

describe('createEmptyForm', () => {
	it('returns a form with empty fields and no vehicles/photos', () => {
		const form = createEmptyForm();
		expect(form.firstName).toBe('');
		expect(form.vehicles).toEqual([]);
		expect(form.photos).toEqual([]);
	});

	it('returns a fresh object on each call', () => {
		const a = createEmptyForm();
		const b = createEmptyForm();
		expect(a).not.toBe(b);
		a.vehicles.push(createEmptyVehicle('x'));
		expect(b.vehicles).toEqual([]);
	});
});
