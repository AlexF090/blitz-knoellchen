import { describe, expect, it, vi } from 'vitest';
import { installPrompt, type BeforeInstallPromptEvent } from './installPrompt.svelte';

const makeEvent = (
	overrides: Partial<Pick<BeforeInstallPromptEvent, 'prompt' | 'userChoice'>> = {}
): BeforeInstallPromptEvent => {
	const event = new Event('beforeinstallprompt', { cancelable: true });
	return Object.assign(event, {
		platforms: [] as string[],
		prompt: vi.fn().mockResolvedValue(undefined),
		userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
		...overrides
	}) as BeforeInstallPromptEvent;
};

describe('installPrompt', () => {
	it('kann anfangs nicht installiert werden', () => {
		expect(installPrompt.canInstall).toBe(false);
	});

	it('gibt null zurück, wenn kein Install-Prompt anliegt', async () => {
		expect(await installPrompt.prompt()).toBeNull();
	});

	it('erlaubt die Installation nach dem beforeinstallprompt-Event', () => {
		window.dispatchEvent(makeEvent());
		expect(installPrompt.canInstall).toBe(true);
	});

	it('ruft prompt() auf dem Event auf und liefert das Ergebnis von userChoice', async () => {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		window.dispatchEvent(
			makeEvent({
				prompt: promptFn,
				userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' })
			})
		);

		const outcome = await installPrompt.prompt();

		expect(promptFn).toHaveBeenCalledOnce();
		expect(outcome).toBe('dismissed');
		expect(installPrompt.canInstall).toBe(false);
	});

	it('gibt null zurück und wirft nicht, wenn deferredEvent.prompt() rejected', async () => {
		window.dispatchEvent(makeEvent({ prompt: vi.fn().mockRejectedValue(new Error('dismissed')) }));

		await expect(installPrompt.prompt()).resolves.toBeNull();
	});

	it('gibt null zurück und wirft nicht, wenn userChoice rejected', async () => {
		window.dispatchEvent(makeEvent({ userChoice: Promise.reject(new Error('userChoice failed')) }));

		await expect(installPrompt.prompt()).resolves.toBeNull();
	});

	it('verhindert bei zwei überlappenden Aufrufen die doppelte Nutzung desselben Events', async () => {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		window.dispatchEvent(
			makeEvent({
				prompt: promptFn,
				userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
			})
		);

		const [first, second] = await Promise.all([installPrompt.prompt(), installPrompt.prompt()]);

		expect(promptFn).toHaveBeenCalledOnce();
		expect([first, second].sort()).toEqual([null, 'accepted'].sort());
	});

	it('markiert die App nach dem appinstalled-Event als installiert', () => {
		window.dispatchEvent(makeEvent());
		expect(installPrompt.canInstall).toBe(true);

		window.dispatchEvent(new Event('appinstalled'));

		expect(installPrompt.canInstall).toBe(false);
	});
});
