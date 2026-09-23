import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import { LOCATIONIQ_MIN_INTERVAL_MS, waitForSlot } from '$lib/geocode/rateLimiter';
import {
	createBigDataCloudProvider,
	createLocationIqProvider,
	reverseGeocode
} from '$lib/geocode/reverseGeocode';
import type { RequestHandler } from './$types';

/**
 * Reverse-Geocoding-Proxy: liefert die Adresse zu `lat`/`lon`.
 * Läuft serverseitig, damit der LocationIQ-API-Schlüssel nicht an den Client gelangt.
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'lat/lon fehlen oder sind ungültig.' }, { status: 400 });
	}

	// Blockierend warten statt drosseln: pro Foto fällt nur ein Lookup an, das kurze Warten
	// ist unmerklich (s. rateLimiter.ts).
	await waitForSlot(LOCATIONIQ_MIN_INTERVAL_MS);

	const providers = [
		createLocationIqProvider(LOCATIONIQ_API_KEY, fetch),
		createBigDataCloudProvider(fetch)
	];
	const result = await reverseGeocode(lat, lon, providers);

	if (!result.address) return json({ error: result.error }, { status: 502 });
	return json({ address: result.address });
};
