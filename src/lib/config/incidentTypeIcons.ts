import type { Component } from 'svelte';
import SignNoParking from '$lib/components/icons/SignNoParking.svelte';
import SignNoStopping from '$lib/components/icons/SignNoStopping.svelte';

// Nur Verstoßarten mit einem eindeutigen, unverwechselbaren Verkehrszeichen bekommen ein Icon
// (Halteverbot Zeichen 283, Parkverbot Zeichen 286) — für den Schwerbehinderten-Parkplatz und
// die übrigen Verstoßarten gibt es kein einzelnes, eindeutig abbildbares Schild.
export const INCIDENT_TYPE_ICONS: Partial<
	Record<string, Component<{ class?: string; 'aria-hidden'?: 'true' | 'false' }>>
> = {
	halteverbot: SignNoStopping,
	parkverbot: SignNoParking
};
