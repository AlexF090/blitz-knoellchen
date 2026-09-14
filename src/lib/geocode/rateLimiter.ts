// LocationIQs Rate-Limit gilt prozessweit für Reverse-Geocode und Autocomplete zusammen — beide
// Endpunkte teilen sich deshalb sowohl diese Konstante als auch den Modul-Timestamp unten.
export const LOCATIONIQ_MIN_INTERVAL_MS = 1000;

// Modul-State: gilt pro Server-Prozess, gemeinsam für alle Aufrufer dieses Moduls.
let lastRequestAt = 0;

// Non-blocking Soft-Limit für Endpunkte, die bei Überschreitung lieber sofort ein leeres/
// neutrales Ergebnis liefern, statt Anfragen zu stauen (z. B. Autocomplete während des Tippens).
export const shouldThrottle = (minIntervalMs: number): boolean => {
	const now = Date.now();
	if (now - lastRequestAt < minIntervalMs) return true;
	lastRequestAt = now;
	return false;
};

// Blocking Wartemuster für Endpunkte mit nur einem Call pro Vorgang (Reverse-Geocode) — dort ist
// ein kurzes Warten unmerklich und einfacher als ein Retry auf Client-Seite.
export const waitForSlot = async (minIntervalMs: number): Promise<void> => {
	const elapsed = Date.now() - lastRequestAt;
	if (elapsed < minIntervalMs) {
		await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
	}
	lastRequestAt = Date.now();
};
