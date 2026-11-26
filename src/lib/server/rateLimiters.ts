import { SEND_LIMIT_PER_MINUTE } from '$app/env/private';
import { selectRateLimiter, type RequestRateLimiter } from './requestRateLimiter.ts';
import { getWorkerBindings } from './workerBindings.ts';

// Die Werte stehen auch in `ratelimits` in wrangler.jsonc und müssen dort gleich sein. Hier
// gelten sie nur für den Speicher-Limiter ohne Binding.
// /api/send: Die BCC-Kopie geht an die vom Client angegebene Adresse; ohne Drosselung ließe sich
// der Endpunkt als Relay an beliebige Adressen nutzen. 10 pro Minute reicht für eine Anzeige mit
// mehreren Fahrzeugen (eine Anfrage pro Fahrzeug) und Wiederholungen nach Fehlern.
const SEND_LIMIT = { limit: 10 };
// /api/geocode und /api/geocode/autocomplete zusammen: schützt das LocationIQ-Kontingent vor
// einzelnen Clients. Autocomplete fragt beim Tippen mehrfach pro Adresse.
const GEOCODE_LIMIT = { limit: 30 };

let sendRateLimiter: RequestRateLimiter | undefined;
let geocodeRateLimiter: RequestRateLimiter | undefined;

// Erst beim ersten Aufruf erzeugt: Die Bindings sind in `vite preview` erst gesetzt, wenn der
// Preview-Server läuft. Danach bleibt die Instanz, damit der Speicher-Limiter weiterzählt.
/** Rate-Limiter für POST /api/send. */
export const getSendRateLimiter = (): RequestRateLimiter =>
	(sendRateLimiter ??= selectRateLimiter(
		getWorkerBindings().SEND_RATE_LIMITER,
		SEND_LIMIT,
		SEND_LIMIT_PER_MINUTE
	));

/** Rate-Limiter für die Geocoding-Endpunkte. */
export const getGeocodeRateLimiter = (): RequestRateLimiter =>
	(geocodeRateLimiter ??= selectRateLimiter(
		getWorkerBindings().GEOCODE_RATE_LIMITER,
		GEOCODE_LIMIT,
		undefined
	));
