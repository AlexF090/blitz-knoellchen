import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Accordion, { type AccordionItem } from './Accordion.svelte';

const textSnippet = (text: string) =>
	createRawSnippet(() => ({
		render: () => `<p>${text}</p>`
	}));

const items: AccordionItem[] = [
	{ id: 'a', question: 'Frage A', answer: textSnippet('Antwort A') },
	{ id: 'b', question: 'Frage B', answer: textSnippet('Antwort B') }
];

describe('Accordion', () => {
	it('öffnet eine Frage und schließt die zuvor geöffnete automatisch', async () => {
		await render(Accordion, { items });

		const buttonA = page.getByRole('button', { name: 'Frage A' });
		const buttonB = page.getByRole('button', { name: 'Frage B' });

		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'false');
		await expect.element(buttonB).toHaveAttribute('aria-expanded', 'false');

		await userEvent.click(buttonA);
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByText('Antwort A')).toBeInTheDocument();

		await userEvent.click(buttonB);
		await expect.element(buttonB).toHaveAttribute('aria-expanded', 'true');
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'false');
		await expect.element(page.getByText('Antwort A')).not.toBeInTheDocument();
	});

	it('schließt eine offene Frage erneut beim Klick auf dieselbe Frage', async () => {
		await render(Accordion, { items });
		const buttonA = page.getByRole('button', { name: 'Frage A' });

		await userEvent.click(buttonA);
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'true');

		await userEvent.click(buttonA);
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'false');
	});

	it('rendert nichts bei leerem items-Array', async () => {
		const { container } = await render(Accordion, { items: [] });

		expect(container.querySelectorAll('button')).toHaveLength(0);
	});

	it('nutzt den Leerstring-Fallback für ID- und Text-basierte Attribute bei fehlenden Feldern', async () => {
		// id/question sind laut Typ Pflichtfelder; zur Laufzeit kompiliert Svelte die abgeleiteten
		// Attribute/Texte (`id`/`aria-controls`/`aria-labelledby`/Fragetext) dennoch mit einem
		// `?? ''`-Fallback. Nur zur Laufzeit fehlende Werte (hier bewusst per Type-Cast erzwungen)
		// decken diesen Fallback-Zweig ab.
		const itemsWithMissingFields = [
			{ id: undefined, question: undefined, answer: textSnippet('Antwort ohne ID') }
		] as unknown as AccordionItem[];

		const { container } = await render(Accordion, { items: itemsWithMissingFields });
		const button = container.querySelector('button') as HTMLButtonElement;

		expect(button.id).toBe('-button');
		expect(button.getAttribute('aria-controls')).toBe('-panel');
		expect(button.textContent?.trim()).toBe('');

		await userEvent.click(button);

		const region = page.getByRole('region');
		await expect.element(region).toHaveAttribute('id', '-panel');
		await expect.element(region).toHaveAttribute('aria-labelledby', '-button');
	});
});
