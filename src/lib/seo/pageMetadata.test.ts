import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '#lib/site.ts';
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

	it.each(['/', '/faq', '/datenschutz', '/historie'])(
		'beginnt jede ausgegebene URL für %s mit SITE_ORIGIN',
		(pathname) => {
			const metadata = buildPageMetadata(pathname);

			for (const url of Object.values(metadata)) {
				expect(url.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
			}
		}
	);
});
