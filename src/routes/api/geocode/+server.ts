import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import {
	createBigDataCloudProvider,
	createLocationIqProvider,
	reverseGeocode
} from '$lib/geocode/reverseGeocode';
import type { RequestHandler } from './$types';

// Konservative Drosselung für diesen Server-Prozess — liegt sicher unter LocationIQs
// Free-Tier-Limit von 2 Requests/Sekunde.
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
		createLocationIqProvider(LOCATIONIQ_API_KEY, fetch),
		createBigDataCloudProvider(fetch)
	];
	const result = await reverseGeocode(lat, lon, providers);

	if (!result.address) return json({ error: result.error }, { status: 502 });
	return json({ address: result.address });
};
