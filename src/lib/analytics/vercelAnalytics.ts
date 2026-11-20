/** Pfad, unter dem Vercel das Analytics-Skript für jedes Deployment selbst ausliefert. */
export const VERCEL_ANALYTICS_SCRIPT_SRC = '/_vercel/insights/script.js';

type VercelAnalyticsCommand = (...parameters: unknown[]) => void;

declare global {
	interface Window {
		/** Befehlsschnittstelle des Vercel-Analytics-Skripts. */
		va?: VercelAnalyticsCommand;
		/** Befehle, die vor dem Laden des Skripts eingehen; das Skript arbeitet sie danach ab. */
		vaq?: unknown[][];
	}
}

/**
 * Bindet Vercel Web Analytics ein: legt die Befehls-Queue an und lädt das Skript einmalig.
 * Seitenaufrufe zählt das Skript nicht selbst; sie kommen über `trackPageview`.
 */
// Das Skript zählt sonst jede Adresse einzeln; mit eigenen Meldungen gruppiert das Dashboard
// nach SvelteKit-Route.
export const injectVercelAnalytics = (targetWindow: Window = window): void => {
	targetWindow.va ??= (...parameters: unknown[]) => {
		targetWindow.vaq ??= [];
		targetWindow.vaq.push(parameters);
	};

	const { document } = targetWindow;
	if (document.head.querySelector(`script[src="${VERCEL_ANALYTICS_SCRIPT_SRC}"]`)) return;
	const script = document.createElement('script');
	script.src = VERCEL_ANALYTICS_SCRIPT_SRC;
	script.defer = true;
	script.dataset.disableAutoTrack = '1';
	document.head.appendChild(script);
};

/** Meldet einen Seitenaufruf mit Route-Muster (z. B. `/historie`) und tatsächlichem Pfad. */
export const trackPageview = (route: string, path: string, targetWindow: Window = window): void => {
	targetWindow.va?.('pageview', { route, path });
};

/** Meldet einen Seitenaufruf; ohne Route-Muster (z. B. 404) wird nichts gemeldet. */
export type PageviewTracker = (route: string | null, path: string) => void;

/**
 * Bindet Analytics ein, falls `enabled`, und liefert die Funktion für Seitenaufrufe. Ausgeschaltet
 * lädt sie nichts und meldet nichts.
 */
export const createVercelAnalytics = (enabled: boolean, targetWindow?: Window): PageviewTracker => {
	if (!enabled) return () => {};
	injectVercelAnalytics(targetWindow);
	return (route, path) => {
		if (route) trackPageview(route, path, targetWindow);
	};
};
