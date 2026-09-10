import { json } from '@sveltejs/kit';
import { NOMINATIM_USER_AGENT } from '$env/static/private';
import {
	createBigDataCloudProvider,
	createNominatimProvider,
	reverseGeocode
} from '$lib/geocode/reverseGeocode';
import type { RequestHandler } from './$types';

// Nominatim Usage Policy: max. 1 Request/Sekunde für diesen Server-Prozess.
const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'lat/lon fehlen oder sind ungültig.' }, { status: 400 });
	}

	const now = Date.now();
	const elapsed = now - lastRequestAt;
	if (elapsed < MIN_INTERVAL_MS) {
		await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
	}
	lastRequestAt = Date.now();

	const providers = [
		createNominatimProvider(NOMINATIM_USER_AGENT, fetch),
		createBigDataCloudProvider(fetch)
	];
	const result = await reverseGeocode(lat, lon, providers);

	if (!result.address) return json({ error: result.error }, { status: 502 });
	return json({ address: result.address });
};
