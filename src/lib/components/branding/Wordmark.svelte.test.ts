import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Wordmark from './Wordmark.svelte';

describe('Wordmark', () => {
	it('rendert die Wortmarke in Standardgröße (sm)', async () => {
		await render(Wordmark);

		await expect.element(page.getByText('BLITZ')).toBeInTheDocument();
		await expect.element(page.getByText('KNÖLLCHEN')).toBeInTheDocument();
	});

	it('rendert die Wortmarke in Größe lg', async () => {
		await render(Wordmark, { size: 'lg' });

		await expect.element(page.getByText('BLITZ')).toBeInTheDocument();
		await expect.element(page.getByText('KNÖLLCHEN')).toBeInTheDocument();
	});
});
