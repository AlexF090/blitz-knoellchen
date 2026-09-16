import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

// Simuliert den vom PWA-Build-Plugin erzeugten Manifest-Link-Tag, der in der Dev-Umgebung fehlt —
// deckt den {#if pwaInfo?.webManifest?.linkTag}-Zweig ab, der sonst nie wahr wird.
vi.mock('virtual:pwa-info', () => ({
	pwaInfo: { webManifest: { linkTag: '<link rel="manifest" href="/manifest.webmanifest" />' } }
}));

describe('+page.svelte (Startseite)', () => {
	it('rendert Header-Link zur Historie und das Meldeformular', async () => {
		const { default: HomePage } = await import('./+page.svelte');
		render(HomePage, {
			data: {
				demoRecipientEmail: 'demo@example.com',
				liveRecipientEmail: 'live@example.com',
				senderEmail: 'absender@example.com'
			},
			params: {},
			form: null
		});

		await expect.element(page.getByRole('link', { name: 'Historie' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		expect(document.querySelector('link[rel="manifest"]')).not.toBeNull();
	});
});
