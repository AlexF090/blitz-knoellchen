// Nur die Bindings aus wrangler.jsonc, die die App nutzt. Vollständige Typen per `wrangler types`
// brächten die komplette Workers-Runtime als Globals mit; diese kollidieren mit den DOM-Typen.
declare module 'cloudflare:workers' {
	import type { RateLimitBinding } from './lib/server/requestRateLimiter.ts';

	/** Bindings des Workers; ohne Wrangler-Konfiguration (z. B. in Unit-Tests) nicht gesetzt. */
	export const env: {
		SEND_RATE_LIMITER?: RateLimitBinding;
		GEOCODE_RATE_LIMITER?: RateLimitBinding;
	};
}
