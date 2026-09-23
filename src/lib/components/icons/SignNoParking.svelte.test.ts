import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SignNoParking from './SignNoParking.svelte';

describe('SignNoParking', () => {
	it('rendert das Parkverbot-Zeichen mit fester Quelle und Alt-Text', async () => {
		await render(SignNoParking);

		const img = page.getByAltText('Verkehrszeichen 286 (Parkverbot)');
		await expect.element(img).toBeInTheDocument();
		await expect.element(img).toHaveAttribute('src', '/signs/zeichen-286-parkverbot.svg');
	});

	it('gibt class und aria-hidden weiter', async () => {
		await render(SignNoParking, { class: 'size-6', 'aria-hidden': 'true' });

		const img = page.getByAltText('Verkehrszeichen 286 (Parkverbot)');
		await expect.element(img).toHaveAttribute('class', 'size-6');
		await expect.element(img).toHaveAttribute('aria-hidden', 'true');
	});
});
