import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { isIosSafari } from '$lib/pwa/isIosSafari';
import IosInstallBanner from './IosInstallBanner.svelte';

vi.mock('$lib/pwa/isIosSafari', () => ({
	isIosSafari: vi.fn()
}));

const mockedIsIosSafari = vi.mocked(isIosSafari);

const stubMatchMedia = (matches: boolean) => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn().mockReturnValue({
			matches,
			media: '',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		})
	);
};

describe('IosInstallBanner', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('ist unsichtbar, wenn der User-Agent nicht als iOS Safari erkannt wird', async () => {
		stubMatchMedia(false);
		mockedIsIosSafari.mockReturnValue(false);

		render(IosInstallBanner);

		expect(page.getByRole('note').elements()).toHaveLength(0);
	});

	it('ist unsichtbar, wenn die App bereits im Standalone-Modus läuft', async () => {
		stubMatchMedia(true);
		mockedIsIosSafari.mockReturnValue(true);

		render(IosInstallBanner);

		expect(page.getByRole('note').elements()).toHaveLength(0);
	});

	it('ist sichtbar für iOS Safari außerhalb des Standalone-Modus und lässt sich schließen', async () => {
		stubMatchMedia(false);
		mockedIsIosSafari.mockReturnValue(true);

		render(IosInstallBanner);

		const note = page.getByRole('note');
		await expect.element(note).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Hinweis schließen' }));

		await expect.element(note).not.toBeInTheDocument();
	});
});
