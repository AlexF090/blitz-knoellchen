import { describe, expect, it } from 'vitest';
import { createEmptyVehicle } from '$lib/validation/emptyForm';
import { buildHistoryEntry } from './buildHistoryEntry';

describe('buildHistoryEntry', () => {
	it('builds a history entry from profile, vehicle, incident types and photos', () => {
		const vehicle = {
			...createEmptyVehicle('vehicle-1'),
			licensePlate: 'K AB 1234',
			licensePlateCountry: 'D',
			vehicleType: 'PKW',
			make: 'VW',
			color: 'Rot',
			notes: 'Auffällig',
			locationStreet: 'Domkloster',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Köln'
		};
		const photoBlob = new Blob(['foto']);

		const entry = buildHistoryEntry({
			id: 'entry-1',
			timestamp: 1700000000000,
			firstName: 'Max',
			lastName: 'Mustermann',
			vehicle,
			incidentTypes: [{ id: 'gehweg', label: 'Gehweg', description: 'Auf dem Gehweg geparkt' }],
			photos: [{ id: 'p1', blob: photoBlob, fileName: 'a.jpg', gps: null, date: null, time: null }]
		});

		expect(entry.id).toBe('entry-1');
		expect(entry.timestamp).toBe(1700000000000);
		expect(entry.firstName).toBe('Max');
		expect(entry.locationAddress).toBe('Domkloster 4, 50667 Köln');
		expect(entry.incidentTypeLabels).toEqual(['Gehweg']);
		// Kanonisches Kölner Format, nicht die Roheingabe.
		expect(entry.licensePlate).toBe('K-AB1234');
		expect(entry.thumbnails).toEqual([photoBlob]);
	});
});
