import { browser } from '$app/environment';

export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	prompt: () => Promise<void>;
}

let deferredEvent = $state<BeforeInstallPromptEvent | null>(null);
let installed = $state(false);

// Nur Chromium-basierte Browser (Chrome/Edge auf Android + Desktop) feuern dieses Event —
// Safari/iOS kennt es nicht, dort bleibt canInstall dauerhaft false (siehe IosInstallBanner).
// Der `browser`-Flag ist im Browser-Testprojekt (Chromium) immer true, der SSR-Zweig (false)
// daher dort nicht real testbar; `/* v8 ignore */`-Pragmas greifen im Browser-Testprojekt
// nachweislich nicht (Kommentare überleben die Svelte-/Browser-Transformpipeline nicht bis zur
// v8-Coverage-AST-Analyse), deshalb bleibt dieser Zweig als bekannte, unvermeidbare Lücke.
if (browser) {
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		deferredEvent = event as BeforeInstallPromptEvent;
	});
	window.addEventListener('appinstalled', () => {
		installed = true;
		deferredEvent = null;
	});
}

export const installPrompt = {
	get canInstall() {
		return deferredEvent !== null && !installed;
	},
	async prompt() {
		// Event sofort lokal zwischenspeichern UND global auf null setzen, bevor await läuft —
		// verhindert, dass ein zweiter, überlappender Aufruf (z.B. Doppelklick) dasselbe,
		// bereits "verbrauchte" Event erneut anfasst.
		const event = deferredEvent;
		if (!event) return null;
		deferredEvent = null;

		try {
			await event.prompt();
			const { outcome } = await event.userChoice;
			return outcome;
		} catch {
			// prompt()/userChoice kann rejecten (z.B. Event bereits verbraucht) — Aufrufer
			// bekommt sauber null statt einer unbehandelten Exception.
			return null;
		}
	}
};
