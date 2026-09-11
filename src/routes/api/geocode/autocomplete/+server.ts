import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import { createLocationIqAutocompleteProvider } from '$lib/geocode/autocomplete';
import { shouldThrottle } from '$lib/geocode/rateLimiter';
import type { RequestHandler } from './$types';

// Non-blocking Soft-Limit — anders als der blockierende Reverse-Geocode-Proxy, siehe
// rateLimiter.ts und die ADR in CLAUDE.md. Gilt gemeinsam mit /api/geocode.
const MIN_INTERVAL_MS = 1000;

export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 3) return json({ suggestions: [] });
	if (shouldThrottle(MIN_INTERVAL_MS)) return json({ suggestions: [] });

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
