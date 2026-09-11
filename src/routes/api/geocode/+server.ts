import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import { waitForSlot } from '$lib/geocode/rateLimiter';
import {
	createBigDataCloudProvider,
	createLocationIqProvider,
	reverseGeocode
} from '$lib/geocode/reverseGeocode';
import type { RequestHandler } from './$types';

// Konservative Drosselung für diesen Server-Prozess — liegt sicher unter LocationIQs
// Free-Tier-Limit von 2 Requests/Sekunde. Gilt gemeinsam mit /api/geocode/autocomplete
// (siehe rateLimiter.ts).
const MIN_INTERVAL_MS = 1000;

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'lat/lon fehlen oder sind ungültig.' }, { status: 400 });
	}

	await waitForSlot(MIN_INTERVAL_MS);

	const providers = [
		createLocationIqProvider(LOCATIONIQ_API_KEY, fetch),
		createBigDataCloudProvider(fetch)
	];
	const result = await reverseGeocode(lat, lon, providers);

	if (!result.address) return json({ error: result.error }, { status: 502 });
	return json({ address: result.address });
};
