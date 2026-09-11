// registerType: 'autoUpdate' (vite.config.ts) aktiviert eine per update() gefundene neue
// Service-Worker-Version automatisch (skipWaiting/clientsClaim) — der nachfolgende Reload lädt
// dadurch bereits die neueste Version statt nur die zuvor gecachte App-Shell.
// `reload` ist injizierbar, da sich `location.reload` in echten Browsern (Playwright/Chromium)
// aus Sicherheitsgründen nicht überschreiben/spyen lässt.
export const reloadWithLatestVersion = async (reload: () => void = () => location.reload()) => {
	if ('serviceWorker' in navigator) {
		try {
			const registration = await navigator.serviceWorker.getRegistration();
			await registration?.update();
		} catch {
			// Update-Check fehlgeschlagen (z.B. offline) — Reload läuft trotzdem, dann eben mit
			// der zuletzt aktivierten Version.
		}
	}
	reload();
};
