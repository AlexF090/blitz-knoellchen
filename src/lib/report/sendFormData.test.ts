import { describe, expect, it } from 'vitest';
import { buildSendFormData, parseSendFormData, type BuildSendFormDataInput } from './sendFormData';

const baseInput: BuildSendFormDataInput = {
	profile: {
		firstName: 'Max',
		lastName: 'Mustermann',
		addressStreet: 'Musterstraße 1',
		addressPostcode: '50667',
		addressCity: 'Köln',
		email: 'max@example.com',
		phone: '0221 12345678'
	},
	vehicle: {
		licensePlate: 'K AB 1234',
		licensePlateCountry: 'D',
		vehicleType: 'PKW',
		make: 'VW',
		color: 'Rot',
		incidentTypeIds: ['gehweg', 'kreuzung'],
		notes: 'Auffällig lange geparkt.',
		date: '2026-03-01',
		time: '12:00',
		timeMode: 'parkverstoss',
		endTime: '12:10',
		locationStreet: 'Domkloster',
		locationHouseNumber: '4',
		locationPostcode: '50667',
		locationCity: 'Köln'
	},
	vehicleIndex: 1,
	vehicleTotal: 2,
	mode: 'live',
	photos: [{ blob: new Blob(['foto']), fileName: 'beweisfoto-1.jpg' }]
};

describe('buildSendFormData / parseSendFormData round trip', () => {
	it('reconstructs the exact input for a fully filled form', () => {
		const parsed = parseSendFormData(buildSendFormData(baseInput));

		expect(parsed.profile).toEqual(baseInput.profile);
		expect(parsed.vehicle).toEqual(baseInput.vehicle);
		expect(parsed.vehicleIndex).toBe(1);
		expect(parsed.vehicleTotal).toBe(2);
		expect(parsed.mode).toBe('live');
		expect(parsed.photoBlobs).toHaveLength(1);
		expect(parsed.photoBlobs[0].name).toBe('beweisfoto-1.jpg');
	});

	it('round-trips optional fields left empty as undefined', () => {
		const input: BuildSendFormDataInput = {
			...baseInput,
			profile: { ...baseInput.profile, phone: undefined },
			vehicle: {
				...baseInput.vehicle,
				notes: undefined,
				endTime: undefined,
				locationHouseNumber: undefined,
				timeMode: 'halteverstoss'
			}
		};

		const parsed = parseSendFormData(buildSendFormData(input));

		expect(parsed.profile.phone).toBeUndefined();
		expect(parsed.vehicle.notes).toBeUndefined();
		expect(parsed.vehicle.endTime).toBeUndefined();
		expect(parsed.vehicle.locationHouseNumber).toBeUndefined();
		expect(parsed.vehicle.timeMode).toBe('halteverstoss');
	});

	it("does not normalize the license plate — that stays the handler's job", () => {
		const parsed = parseSendFormData(buildSendFormData(baseInput));
		expect(parsed.vehicle.licensePlate).toBe('K AB 1234');
	});

	it('falls back to demo mode for a missing or manipulated mode value', () => {
		const formData = buildSendFormData({ ...baseInput, mode: 'not-a-real-mode' });
		expect(parseSendFormData(formData).mode).toBe('demo');

		const emptyFormData = new FormData();
		expect(parseSendFormData(emptyFormData).mode).toBe('demo');
	});

	it('derives incidentTypeIds and photos from repeated form fields', () => {
		const input: BuildSendFormDataInput = {
			...baseInput,
			photos: [
				{ blob: new Blob(['a']), fileName: 'a.jpg' },
				{ blob: new Blob(['b']), fileName: 'b.jpg' }
			]
		};
		const parsed = parseSendFormData(buildSendFormData(input));
		expect(parsed.vehicle.incidentTypeIds).toEqual(['gehweg', 'kreuzung']);
		expect(parsed.photoBlobs.map((p) => p.name)).toEqual(['a.jpg', 'b.jpg']);
	});
});
