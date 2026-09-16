import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SignNoStopping from './SignNoStopping.svelte';

describe('SignNoStopping', () => {
	it('rendert das Halteverbot-Zeichen mit fester Quelle und Alt-Text', async () => {
		render(SignNoStopping);

		const img = page.getByAltText('Verkehrszeichen 283 (Halteverbot)');
		await expect.element(img).toBeInTheDocument();
		await expect.element(img).toHaveAttribute('src', '/signs/zeichen-283-halteverbot.svg');
	});

	it('gibt class und aria-hidden weiter', async () => {
		render(SignNoStopping, { class: 'size-6', 'aria-hidden': 'true' });

		const img = page.getByAltText('Verkehrszeichen 283 (Halteverbot)');
		await expect.element(img).toHaveAttribute('class', 'size-6');
		await expect.element(img).toHaveAttribute('aria-hidden', 'true');
	});
});
