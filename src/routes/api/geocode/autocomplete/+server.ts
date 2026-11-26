import { GEOAPIFY_API_KEY } from '$app/env/private';
import { createGeoapifyAutocompleteProvider } from '#lib/geocode/autocomplete.ts';
import { GEOAPIFY_MIN_INTERVAL_MS, shouldThrottle } from '#lib/geocode/rateLimiter.ts';
import { getGeocodeRateLimiter } from '#lib/server/rateLimiters.ts';
import type { RequestHandler } from './$types';

/**
 * Autocomplete-Proxy: liefert Adressvorschläge zu `q`.
 * Läuft serverseitig, damit der Geoapify-API-Schlüssel nicht an den Client gelangt.
 */
export const GET: RequestHandler = async ({ url, fetch, getClientAddress }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 3) return Response.json({ suggestions: [] });
	// Leere Liste statt 429: Der Client zeigt dann einfach keine Vorschläge an.
	if (!(await getGeocodeRateLimiter().tryConsume(getClientAddress()))) {
		return Response.json({ suggestions: [] });
	}
	// Non-blocking Soft-Limit statt Warten wie beim Reverse-Geocode-Proxy: beim Tippen dürfen
	// sich keine Anfragen stauen (s. rateLimiter.ts und die ADR in docs/architektur.md).
	if (shouldThrottle(GEOAPIFY_MIN_INTERVAL_MS)) return Response.json({ suggestions: [] });

	try {
		const suggestions = await createGeoapifyAutocompleteProvider(GEOAPIFY_API_KEY, fetch).search(q);
		return Response.json({ suggestions });
	} catch (error) {
		console.error('[autocomplete] fehlgeschlagen:', error);
		// Leere Liste statt Fehlerstatus: Vorschläge sind eine Hilfe, der Nutzer kann die
		// Adresse jederzeit von Hand eintippen.
		return Response.json({ suggestions: [] });
	}
};
