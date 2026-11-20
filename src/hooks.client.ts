import type { ClientInit } from '@sveltejs/kit/hooks';
import { registerSW } from 'virtual:pwa-register';

/**
 * Registriert den Service Worker beim Start der App. Eine neue Version wird im Hintergrund aktiv,
 * die offene Seite lädt dafür aber nicht neu.
 */
// Ein automatischer Reload träfe Nutzer mitten im Ausfüllen; Schreibvorgänge kurz davor gehen
// verloren. Die neue Version erscheint beim nächsten Öffnen oder per Pull-to-Refresh
// (reloadLatest.ts).
export const init: ClientInit = () => {
	registerSW({ immediate: true, onNeedReload: () => {} });
};
