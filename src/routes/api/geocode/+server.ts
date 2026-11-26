import { GEOAPIFY_API_KEY } from '$app/env/private';
import { GEOAPIFY_MIN_INTERVAL_MS, waitForSlot } from '#lib/geocode/rateLimiter.ts';
import { createGeoapifyProvider, reverseGeocode } from '#lib/geocode/reverseGeocode.ts';
import { getGeocodeRateLimiter } from '#lib/server/rateLimiters.ts';
import type { RequestHandler } from './$types';

/**
 * Reverse-Geocoding-Proxy: liefert die Adresse zu `lat`/`lon`.
 * Läuft serverseitig, damit der Geoapify-API-Schlüssel nicht an den Client gelangt.
 */
export const GET: RequestHandler = async ({ url, fetch, getClientAddress }) => {
	if (!(await getGeocodeRateLimiter().tryConsume(getClientAddress()))) {
		return Response.json({ error: 'Zu viele Anfragen.' }, { status: 429 });
	}

	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return Response.json({ error: 'lat/lon fehlen oder sind ungültig.' }, { status: 400 });
	}

	// Blockierend warten statt drosseln: pro Foto fällt nur ein Lookup an, das kurze Warten
	// ist unmerklich (s. rateLimiter.ts).
	await waitForSlot(GEOAPIFY_MIN_INTERVAL_MS);

	const result = await reverseGeocode(lat, lon, [createGeoapifyProvider(GEOAPIFY_API_KEY, fetch)]);

	if (!result.address) return Response.json({ error: result.error }, { status: 502 });
	return Response.json({ address: result.address });
};
