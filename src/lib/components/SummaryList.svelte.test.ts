import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SummaryList from './SummaryList.svelte';
import type { SummaryRow } from '$lib/report/vehicleSummary';

describe('SummaryList', () => {
	it('rendert mehrere Zeilen mit Label und Wert', async () => {
		const rows: SummaryRow[] = [
			{ label: 'Kennzeichen', value: 'K-AB 123' },
			{ label: 'Farbe', value: 'Rot' }
		];
		render(SummaryList, { rows });

		await expect.element(page.getByText('Kennzeichen')).toBeInTheDocument();
		await expect.element(page.getByText('K-AB 123')).toBeInTheDocument();
		await expect.element(page.getByText('Farbe')).toBeInTheDocument();
		await expect.element(page.getByText('Rot')).toBeInTheDocument();
	});

	it('rendert nichts bei leerem rows-Array', async () => {
		const { container } = render(SummaryList, { rows: [] });

		const dl = container.querySelector('dl');
		expect(dl?.children).toHaveLength(0);
	});

	it('rendert das leading-Snippet vor den Zeilen', async () => {
		const rows: SummaryRow[] = [{ label: 'Kennzeichen', value: 'K-AB 123' }];
		const leading = createRawSnippet(() => ({
			render: () => `<div data-testid="leading-slot">Fotos</div>`
		}));

		const { container } = render(SummaryList, { rows, leading });

		const dl = container.querySelector('dl');
		const firstChild = dl?.firstElementChild;
		expect(firstChild?.getAttribute('data-testid')).toBe('leading-slot');
		await expect.element(page.getByText('Fotos')).toBeInTheDocument();
	});
});
