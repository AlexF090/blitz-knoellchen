/**
 * Sucht nach einer neuen Service-Worker-Version und lädt die App anschließend neu.
 *
 * @param reload Injizierbar, da sich `location.reload` in echten Browsern (Playwright/Chromium)
 * aus Sicherheitsgründen nicht überschreiben lässt.
 */
export const reloadWithLatestVersion = async (reload: () => void = () => location.reload()) => {
	if ('serviceWorker' in navigator) {
		try {
			const registration = await navigator.serviceWorker.getRegistration();
			// registerType: 'autoUpdate' (vite.config.ts) aktiviert eine hier gefundene neue
			// Version sofort (skipWaiting/clientsClaim) — der Reload unten lädt dadurch die
			// neueste Version statt nur die zuvor gecachte App-Shell.
			await registration?.update();
		} catch {
			// Update-Check fehlgeschlagen (z.B. offline) — Reload läuft trotzdem, dann eben mit
			// der zuletzt aktivierten Version.
		}
	}
	reload();
};
