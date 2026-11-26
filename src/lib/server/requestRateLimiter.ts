import { createFixedWindowRateLimiter } from './fixedWindowRateLimiter.ts';

/** Drosselt Anfragen pro Schlüssel (in der App: pro Client-IP). */
export interface RequestRateLimiter {
	/** Zählt eine Anfrage und meldet `false`, sobald das Limit erreicht ist. */
	tryConsume: (key: string) => Promise<boolean>;
}

/** Der Teil des Cloudflare-Rate-Limiting-Bindings, den die App nutzt. */
export interface RateLimitBinding {
	limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

/** Grenzen eines Rate-Limiters: höchstens `limit` Anfragen pro Schlüssel und Minute. */
export interface PerMinuteLimit {
	limit: number;
}

/** Rate-Limiter über das Cloudflare Rate Limiting Binding (gilt pro Cloudflare-Standort). */
export const createBindingRateLimiter = (binding: RateLimitBinding): RequestRateLimiter => ({
	tryConsume: async (key) => (await binding.limit({ key })).success
});

/** Rate-Limiter im Speicher, nur für lokalen Betrieb und E2E-Tests. */
export const createInMemoryRateLimiter = ({ limit }: PerMinuteLimit): RequestRateLimiter => {
	const limiter = createFixedWindowRateLimiter({ limit, windowMs: 60 * 1000 });
	return { tryConsume: async (key) => limiter.tryConsume(key) };
};

/**
 * Wählt den Rate-Limiter: Ein gesetzter Override (nur E2E-Tests) erzwingt den Speicher-Limiter
 * mit diesem Limit, sonst das Binding. Ohne Binding (z. B. `vite dev` ohne Wrangler-Konfiguration)
 * greift der Speicher-Limiter mit dem Standardlimit.
 */
export const selectRateLimiter = (
	binding: RateLimitBinding | undefined,
	{ limit }: PerMinuteLimit,
	limitOverride: number | undefined
): RequestRateLimiter => {
	if (limitOverride !== undefined) return createInMemoryRateLimiter({ limit: limitOverride });
	if (binding) return createBindingRateLimiter(binding);
	return createInMemoryRateLimiter({ limit });
};
