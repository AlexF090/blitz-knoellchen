import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import { createLocationIqAutocompleteProvider } from '$lib/geocode/autocomplete';
import { LOCATIONIQ_MIN_INTERVAL_MS, shouldThrottle } from '$lib/geocode/rateLimiter';
import type { RequestHandler } from './$types';

// Non-blocking Soft-Limit — anders als der blockierende Reverse-Geocode-Proxy, siehe
// rateLimiter.ts und die ADR in docs/architektur.md.
export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 3) return json({ suggestions: [] });
	if (shouldThrottle(LOCATIONIQ_MIN_INTERVAL_MS)) return json({ suggestions: [] });

	try {
		const suggestions = await createLocationIqAutocompleteProvider(
			LOCATIONIQ_API_KEY,
			fetch
		).search(q);
		return json({ suggestions });
	} catch (error) {
		console.error('[autocomplete] fehlgeschlagen:', error);
		return json({ suggestions: [] });
	}
};
