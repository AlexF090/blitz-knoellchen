import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
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
		// Ohne SvelteKit-Router gibt es keine echte Origin; die absolute URL prüft der Build.
		expect(metaContent('property="og:image"')).toMatch(/\/og-image\.png$/);
		expect(metaContent('name="twitter:card"')).toBe('summary_large_image');
	});
});
