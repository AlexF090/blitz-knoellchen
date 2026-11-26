import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { SITE_ORIGIN } from '#lib/site.ts';
import Layout from './+layout.svelte';

const children = createRawSnippet(() => ({
	render: () => '<p data-testid="layout-child">Inhalt</p>'
}));

const metaContent = (selector: string) =>
	document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

describe('+layout.svelte', () => {
	it('rendert den Seiteninhalt (children-Snippet)', async () => {
		await render(Layout, { children });

		await expect.element(page.getByTestId('layout-child')).toBeInTheDocument();
	});

	it('setzt Open-Graph-Tags für die Link-Vorschau', async () => {
		await render(Layout, { children });

		expect(metaContent('property="og:title"')).toBe('Blitz-Knöllchen');
		expect(metaContent('property="og:description"')).toBe(metaContent('name="description"'));
		expect(metaContent('property="og:image"')).toBe(`${SITE_ORIGIN}/og-image.png`);
		expect(metaContent('name="twitter:card"')).toBe('summary_large_image');
	});

	it('baut og:url und canonical aus der festen Origin statt aus der Seiten-URL', async () => {
		await render(Layout, { children });

		const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
		expect(canonical?.href.startsWith(SITE_ORIGIN)).toBe(true);
		expect(metaContent('property="og:url"')?.startsWith(SITE_ORIGIN)).toBe(true);
		expect(location.origin).not.toBe(SITE_ORIGIN);
	});
});
