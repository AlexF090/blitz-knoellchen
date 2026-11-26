/** Mindestabstand zwischen zwei Geoapify-Anfragen. */
// Der Abstand gilt pro Isolate für Reverse-Geocode und Autocomplete zusammen — beide
// Endpunkte teilen sich deshalb sowohl diese Konstante als auch den Modul-Timestamp unten.
// Geoapify Free erlaubt 5 Anfragen pro Sekunde.
export const GEOAPIFY_MIN_INTERVAL_MS = 250;

// Modul-State: gilt pro Worker-Isolate, gemeinsam für alle Aufrufer dieses Moduls. Das Limit pro
// Client-IP setzt src/lib/server/rateLimiters.ts.
let lastRequestAt = 0;

/**
 * Meldet `true`, wenn der letzte Aufruf noch keine `minIntervalMs` zurückliegt, und reserviert
 * andernfalls den Slot. Non-blocking Soft-Limit für Endpunkte, die bei Überschreitung lieber
 * sofort ein leeres Ergebnis liefern, statt Anfragen zu stauen (z. B. Autocomplete beim Tippen).
 */
export const shouldThrottle = (minIntervalMs: number): boolean => {
	const now = Date.now();
	if (now - lastRequestAt < minIntervalMs) return true;
	lastRequestAt = now;
	return false;
};

/**
 * Wartet, bis der nächste Anfrage-Slot frei ist. Blockierendes Gegenstück zu `shouldThrottle`
 * für Endpunkte mit nur einem Call pro Vorgang (Reverse-Geocode) — dort ist ein kurzes Warten
 * unmerklich und einfacher als ein Retry auf Client-Seite.
 */
export const waitForSlot = async (minIntervalMs: number): Promise<void> => {
	const now = Date.now();
	const elapsed = now - lastRequestAt;
	// Zielzeitpunkt synchron VOR dem `await` reservieren, damit ein quasi gleichzeitiger
	// zweiter Aufruf bereits den korrekten (längeren) Wartezeit-Wert sieht (TOCTOU-Fix).
	const scheduledAt = elapsed < minIntervalMs ? lastRequestAt + minIntervalMs : now;
	lastRequestAt = scheduledAt;

	const waitMs = scheduledAt - now;
	if (waitMs > 0) {
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}
};
