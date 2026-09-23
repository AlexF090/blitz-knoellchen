import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Footer from './Footer.svelte';

// installPrompt ist modul-globaler Runes-State (`$lib/pwa/installPrompt.svelte.ts`). Der
// canInstall-Zustand wird ausschließlich über das reale `beforeinstallprompt`-Event gesetzt —
// hier additiv getestet (kein Zurücksetzen zwischen den Fällen nötig, da der Install-Button erst
// nach dem Event erscheint und die anderen Tests keinen Ausgangszustand voraussetzen).
describe('Footer', () => {
	it('rendert FAQ- und Datenschutz-Links sowie die App-Version, ohne Install-Button', async () => {
		await render(Footer);

		await expect.element(page.getByRole('link', { name: 'FAQ' })).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Datenschutz' })).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'LocationIQ' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'App installieren' }).elements()).toHaveLength(0);
	});

	it('zeigt den Install-Button nach beforeinstallprompt und ruft installPrompt.prompt() beim Klick', async () => {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
			prompt: () => Promise<void>;
			userChoice: Promise<{ outcome: string; platform: string }>;
		};
		event.prompt = promptFn;
		event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
		window.dispatchEvent(event);

		await render(Footer);

		const installButton = page.getByRole('button', { name: 'App installieren' });
		await expect.element(installButton).toBeInTheDocument();

		await userEvent.click(installButton);

		expect(promptFn).toHaveBeenCalled();
	});
});
