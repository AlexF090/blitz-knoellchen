import { Bike } from '@lucide/svelte';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { ImpactOption } from '$lib/config/impactOptions';
import CheckboxGroupFieldset from './CheckboxGroupFieldset.svelte';

const options: ImpactOption[] = [
	{ id: 'a', label: 'Option A', emailText: 'a' },
	{ id: 'b', label: 'Option B', emailText: 'b' }
];

const baseProps = () => ({
	legend: 'Auswahl',
	hint: 'Optional (Mehrfachauswahl möglich)',
	options,
	selectedIds: [] as string[],
	idPrefix: 'testIds-vehicle-1'
});

describe('CheckboxGroupFieldset', () => {
	it('rendert eine Gruppe mit Legende und beschrifteten Checkboxen', async () => {
		await render(CheckboxGroupFieldset, baseProps());

		await expect.element(page.getByRole('group', { name: 'Auswahl' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Option A')).not.toBeChecked();
		await expect.element(page.getByText('Optional (Mehrfachauswahl möglich)')).toBeInTheDocument();
	});

	it('markiert vorausgewählte ids als angehakt', async () => {
		await render(CheckboxGroupFieldset, { ...baseProps(), selectedIds: ['b'] });

		await expect.element(page.getByLabelText('Option B')).toBeChecked();
		await expect.element(page.getByLabelText('Option A')).not.toBeChecked();
	});

	it('wählt per Klick aus und wieder ab', async () => {
		await render(CheckboxGroupFieldset, baseProps());
		const checkbox = page.getByLabelText('Option A');

		await userEvent.click(checkbox);
		await expect.element(checkbox).toBeChecked();

		await userEvent.click(checkbox);
		await expect.element(checkbox).not.toBeChecked();
	});

	it('verknüpft die Fehlermeldung per aria-describedby mit der Gruppe', async () => {
		await render(CheckboxGroupFieldset, { ...baseProps(), error: 'Unbekannte Angabe.' });

		const group = page.getByRole('group', { name: 'Auswahl' });
		await expect
			.element(group)
			.toHaveAttribute('aria-describedby', 'testIds-vehicle-1-hint testIds-vehicle-1-error');
		await expect.element(page.getByRole('alert')).toHaveTextContent('Unbekannte Angabe.');
	});

	it('verknüpft den Hinweis per aria-describedby mit der Gruppe', async () => {
		await render(CheckboxGroupFieldset, baseProps());

		const group = page.getByRole('group', { name: 'Auswahl' });
		await expect.element(group).toHaveAttribute('aria-describedby', 'testIds-vehicle-1-hint');
	});

	it('verknüpft Hinweis und Fehlermeldung gemeinsam mit der Gruppe', async () => {
		await render(CheckboxGroupFieldset, { ...baseProps(), error: 'Unbekannte Angabe.' });

		const group = page.getByRole('group', { name: 'Auswahl' });
		await expect
			.element(group)
			.toHaveAttribute('aria-describedby', 'testIds-vehicle-1-hint testIds-vehicle-1-error');
	});

	it('setzt ohne Hinweis und Fehler kein aria-describedby', async () => {
		await render(CheckboxGroupFieldset, { ...baseProps(), hint: undefined });

		const group = page.getByRole('group', { name: 'Auswahl' });
		await expect.element(group).not.toHaveAttribute('aria-describedby');
	});

	it('ist über die Fieldset-Id fokussierbar', async () => {
		const screen = await render(CheckboxGroupFieldset, baseProps());
		const fieldset = screen.container.querySelector('#testIds-vehicle-1') as HTMLElement;

		fieldset.focus();

		expect(document.activeElement).toBe(fieldset);
	});

	it('zeigt Icons nur für Optionen mit Eintrag, ohne den zugänglichen Namen zu ändern', async () => {
		const { container } = await render(CheckboxGroupFieldset, {
			...baseProps(),
			icons: { a: { kind: 'symbol', component: Bike } }
		});

		await expect.element(page.getByRole('checkbox', { name: 'Option A' })).toBeInTheDocument();
		const labels = container.querySelectorAll('label');
		expect(labels[0].querySelector('[aria-hidden="true"] svg')).not.toBeNull();
		expect(labels[1].querySelector('svg')).toBeNull();
	});
});
