import { describe, expect, it } from 'vitest';
import { findFirstErrorTarget } from './fieldOrder';

describe('findFirstErrorTarget', () => {
	it('returns null when there are no errors', () => {
		expect(findFirstErrorTarget({}, [])).toBeNull();
	});

	it('prioritizes the photos error over everything else', () => {
		const target = findFirstErrorTarget({ photos: 'Pflicht', firstName: 'Pflicht' }, ['vehicle-1']);
		expect(target).toEqual({ type: 'photos' });
	});

	it('picks the first profile field in visual order, not object key order', () => {
		const target = findFirstErrorTarget({ email: 'ungültig', firstName: 'Pflicht' }, []);
		expect(target).toEqual({ type: 'profileField', elementId: 'firstName' });
	});

	it('falls through to the first vehicle error when no profile field has an error', () => {
		const target = findFirstErrorTarget(
			{ vehicles: [{}, { licensePlate: 'Pflicht', color: 'Pflicht' }] },
			['vehicle-a', 'vehicle-b']
		);
		expect(target).toEqual({
			type: 'vehicleField',
			fieldElementId: 'licensePlate-vehicle-b',
			blockElementId: 'vehicle-block-vehicle-b'
		});
	});

	it('returns null when a vehicle error exists but the vehicle id is missing', () => {
		const target = findFirstErrorTarget({ vehicles: [{ make: 'Pflicht' }] }, []);
		expect(target).toBeNull();
	});
});
