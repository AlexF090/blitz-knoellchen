import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Layout from './+layout.svelte';

describe('+layout.svelte', () => {
	it('rendert den Seiteninhalt (children-Snippet)', async () => {
		const children = createRawSnippet(() => ({
			render: () => '<p data-testid="layout-child">Inhalt</p>'
		}));
		await render(Layout, { children });

		await expect.element(page.getByTestId('layout-child')).toBeInTheDocument();
	});
});
