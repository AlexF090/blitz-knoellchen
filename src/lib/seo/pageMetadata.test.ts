import { describe, expect, it } from 'vitest';
import { buildPageMetadata } from './pageMetadata.ts';

describe('buildPageMetadata', () => {
	it('baut canonical und og:url aus der festen Origin', () => {
		const metadata = buildPageMetadata('/faq');

		expect(metadata.canonicalUrl).toBe('https://blitz-knoellchen.appool.de/faq');
		expect(metadata.openGraphUrl).toBe('https://blitz-knoellchen.appool.de/faq');
	});

	it('liefert für die Startseite die Origin mit Schrägstrich', () => {
		expect(buildPageMetadata('/').canonicalUrl).toBe('https://blitz-knoellchen.appool.de/');
	});

	it('zeigt og:image auf die feste Origin', () => {
		expect(buildPageMetadata('/datenschutz').openGraphImageUrl).toBe(
			'https://blitz-knoellchen.appool.de/og-image.png'
		);
	});

	it('hängt nicht von der Origin der Anfrage ab', () => {
		// Die Funktion kennt nur den Pfad: Preview-Deployments und vercel.app-Aufrufe liefern
		// dieselben Werte wie die Produktionsdomain.
		const metadata = buildPageMetadata('/faq');

		expect(JSON.stringify(metadata)).not.toContain('vercel.app');
		expect(JSON.stringify(metadata)).not.toContain('localhost');
	});
});
