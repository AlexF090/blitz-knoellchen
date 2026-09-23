import { json } from '@sveltejs/kit';
import { LOCATIONIQ_API_KEY } from '$env/static/private';
import { createLocationIqAutocompleteProvider } from '$lib/geocode/autocomplete';
import { LOCATIONIQ_MIN_INTERVAL_MS, shouldThrottle } from '$lib/geocode/rateLimiter';
import type { RequestHandler } from './$types';

/**
 * Autocomplete-Proxy: liefert Adressvorschläge zu `q`.
 * Läuft serverseitig, damit der LocationIQ-API-Schlüssel nicht an den Client gelangt.
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 3) return json({ suggestions: [] });
	// Non-blocking Soft-Limit statt Warten wie beim Reverse-Geocode-Proxy: beim Tippen dürfen
	// sich keine Anfragen stauen (s. rateLimiter.ts und die ADR in docs/architektur.md).
	if (shouldThrottle(LOCATIONIQ_MIN_INTERVAL_MS)) return json({ suggestions: [] });

	try {
		const suggestions = await createLocationIqAutocompleteProvider(
			LOCATIONIQ_API_KEY,
			fetch
		).search(q);
		return json({ suggestions });
	} catch (error) {
		console.error('[autocomplete] fehlgeschlagen:', error);
		// Leere Liste statt Fehlerstatus: Vorschläge sind eine Hilfe, der Nutzer kann die
		// Adresse jederzeit von Hand eintippen.
		return json({ suggestions: [] });
	}
};
