import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FormField from './FormField.svelte';

describe('FormField', () => {
	it('rendert Label ohne Pflichtstern, wenn nicht required', async () => {
		render(FormField, { id: 'name', label: 'Name' });

		await expect.element(page.getByText('Name')).toBeInTheDocument();
		const label = document.querySelector('label');
		expect(label?.textContent).not.toContain('*');
	});

	it('rendert Label mit Pflichtstern, wenn required', async () => {
		render(FormField, { id: 'name', label: 'Name', required: true });

		const label = document.querySelector('label');
		expect(label?.textContent).toContain('*');
	});

	it('rendert keine Fehlermeldung ohne error-Prop', async () => {
		render(FormField, { id: 'name', label: 'Name' });

		expect(document.querySelector('[role="alert"]')).toBeNull();
	});

	it('rendert die Fehlermeldung, wenn error gesetzt ist', async () => {
		render(FormField, { id: 'name', label: 'Name', error: 'Pflichtfeld' });

		const alert = page.getByRole('alert');
		await expect.element(alert).toBeInTheDocument();
		await expect.element(alert).toHaveTextContent('Pflichtfeld');
	});

	it('aktualisiert den bindable value bei Eingabe', async () => {
		render(FormField, { id: 'name', label: 'Name', value: '' });

		const input = document.querySelector('input') as HTMLInputElement;
		await userEvent.fill(input, 'Max');

		expect(input.value).toBe('Max');
	});

	it('rendert das control-Snippet statt des Standard-Inputs', async () => {
		const control = createRawSnippet(() => ({
			render: () => `<textarea data-testid="custom-control"></textarea>`
		}));

		render(FormField, { id: 'name', label: 'Name', control });

		expect(document.querySelector('input')).toBeNull();
		expect(document.querySelector('[data-testid="custom-control"]')).not.toBeNull();
	});

	it('nutzt den Leerstring-Fallback für die Fehler-<p>-ID bei fehlender id (zur Laufzeit)', async () => {
		// id ist laut Typ ein Pflichtfeld; Svelte kompiliert die abgeleitete Attribut-ID
		// (`id="{id}-error"`) dennoch mit einem `?? ''`-Fallback. Nur ein zur Laufzeit fehlendes id
		// (hier bewusst per null erzwungen, umgeht Svelte's Default-Handling für undefined) deckt
		// diesen Fallback-Zweig ab.
		render(FormField, {
			id: null as unknown as string,
			label: 'Name',
			error: 'Pflichtfeld'
		});

		const alert = document.querySelector('[role="alert"]');
		expect(alert?.id).toBe('-error');
	});
});
