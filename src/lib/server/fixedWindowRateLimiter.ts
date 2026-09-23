/** Grenzen eines Rate-Limiters: höchstens `limit` Anfragen pro Schlüssel innerhalb von `windowMs`. */
export interface FixedWindowRateLimiterOptions {
	limit: number;
	windowMs: number;
	now?: () => number;
}

interface WindowState {
	startedAt: number;
	count: number;
}

/**
 * Erzeugt einen Fixed-Window-Rate-Limiter im Speicher. `tryConsume` zählt eine Anfrage für den
 * Schlüssel und liefert `false`, sobald das Limit im aktuellen Fenster erreicht ist.
 */
export const createFixedWindowRateLimiter = ({
	limit,
	windowMs,
	now = Date.now
}: FixedWindowRateLimiterOptions) => {
	const windows = new Map<string, WindowState>();

	const removeExpiredWindows = (currentTime: number) => {
		for (const [key, state] of windows) {
			if (currentTime - state.startedAt >= windowMs) windows.delete(key);
		}
	};

	return {
		tryConsume: (key: string): boolean => {
			const currentTime = now();
			// Räumt bei jedem Aufruf auf, damit die Map bei vielen verschiedenen IPs nicht wächst.
			removeExpiredWindows(currentTime);

			const state = windows.get(key);
			if (!state) {
				windows.set(key, { startedAt: currentTime, count: 1 });
				return true;
			}
			if (state.count >= limit) return false;
			state.count += 1;
			return true;
		}
	};
};
