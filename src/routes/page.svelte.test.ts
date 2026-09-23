import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

// Simuliert die vom PWA-Build-Plugin erzeugten Manifest-Daten, die in der Dev-Umgebung fehlen —
// deckt den {#if pwaInfo?.webManifest?.href}-Zweig ab, der sonst nie wahr wird.
vi.mock('virtual:pwa-info', () => ({
	pwaInfo: { webManifest: { href: '/manifest.webmanifest', useCredentials: false } }
}));

// Die echte IndexedDB gehört db.svelte.test.ts; ein paralleler Zugriff von hier machte dessen
// Ergebnisse (und die Coverage von db.ts) abhängig von der Reihenfolge der Testdateien.
vi.mock('$lib/history/db', () => ({
	getDraft: vi.fn(async () => undefined),
	saveDraft: vi.fn(),
	clearDraft: vi.fn(),
	addEntry: vi.fn(),
	getProfile: vi.fn(async () => undefined),
	saveProfile: vi.fn()
}));

describe('+page.svelte (Startseite)', () => {
	it('rendert Header-Link zur Historie und das Meldeformular', async () => {
		const { default: HomePage } = await import('./+page.svelte');
		await render(HomePage, {
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
