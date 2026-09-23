import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import DatenschutzPage from './+page.svelte';

describe('Datenschutz-Seite', () => {
	it('rendert die Überschrift und einen Zurück-Link im Header', async () => {
		await render(DatenschutzPage);

		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Zurück' })).toBeInTheDocument();
	});
});
