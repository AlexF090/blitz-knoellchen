import { describe, expect, it } from 'vitest';
import SignNoParking from '$lib/components/icons/SignNoParking.svelte';
import SignNoStopping from '$lib/components/icons/SignNoStopping.svelte';
import { INCIDENT_TYPE_ICONS } from './incidentTypeIcons';

describe('INCIDENT_TYPE_ICONS', () => {
	it('ordnet Halteverbot und Parkverbot ihre jeweiligen Schild-Icons zu', () => {
		expect(INCIDENT_TYPE_ICONS.halteverbot).toBe(SignNoStopping);
		expect(INCIDENT_TYPE_ICONS.parkverbot).toBe(SignNoParking);
	});

	it('hat für Verstoßarten ohne eindeutiges Schild kein Icon', () => {
		expect(INCIDENT_TYPE_ICONS.gehweg).toBeUndefined();
	});
});
