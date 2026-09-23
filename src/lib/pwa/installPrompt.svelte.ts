import { browser } from '$app/environment';

/** Das noch nicht standardisierte `beforeinstallprompt`-Event, das die PWA-Installation anbietet. */
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
// daher dort nicht real testbar. Ein `/* istanbul ignore */`-Pragma greift in .svelte.ts-Modulen
// nicht (anders als im <script> einer .svelte-Komponente), deshalb bleibt dieser Zweig als
// bekannte Lücke mit eigenem Threshold in vite.config.ts.
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

/** Reaktiver Zugriff auf den PWA-Installationsdialog des Browsers. */
export const installPrompt = {
	get canInstall() {
		return deferredEvent !== null && !installed;
	},
	/** Zeigt den Installationsdialog und liefert die Entscheidung, oder `null` bei Fehlschlag. */
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
