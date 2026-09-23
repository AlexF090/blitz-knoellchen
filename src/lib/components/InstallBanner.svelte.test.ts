import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import InstallBanner from './InstallBanner.svelte';

const dispatchBeforeInstallPrompt = (promptFn: () => Promise<void>) => {
	const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: string; platform: string }>;
	};
	event.prompt = promptFn;
	event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
	window.dispatchEvent(event);
};

describe('InstallBanner', () => {
	it('ist unsichtbar, solange installPrompt.canInstall false ist', async () => {
		await render(InstallBanner);

		expect(page.getByRole('note').elements()).toHaveLength(0);
	});

	it('wird nach beforeinstallprompt sichtbar, ruft prompt() auf und lässt sich schließen', async () => {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		dispatchBeforeInstallPrompt(promptFn);

		await render(InstallBanner);

		const note = page.getByRole('note');
		await expect.element(note).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Installieren' }));
		expect(promptFn).toHaveBeenCalled();
	});

	it('schließt den Banner beim Klick auf das Kreuz', async () => {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		dispatchBeforeInstallPrompt(promptFn);

		await render(InstallBanner);

		const note = page.getByRole('note');
		await expect.element(note).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Hinweis schließen' }));

		await expect.element(note).not.toBeInTheDocument();
	});
});
