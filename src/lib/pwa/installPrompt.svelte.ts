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
		if (!deferredEvent) return null;
		await deferredEvent.prompt();
		const { outcome } = await deferredEvent.userChoice;
		deferredEvent = null;
		return outcome;
	}
};
