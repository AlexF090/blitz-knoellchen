import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import LogoLockup from './LogoLockup.svelte';

describe('LogoLockup', () => {
	it('rendert Icon und Wortmarke', async () => {
		await render(LogoLockup);

		await expect.element(page.getByText('BLITZ')).toBeInTheDocument();
		await expect.element(page.getByText('KNÖLLCHEN')).toBeInTheDocument();
	});
});
