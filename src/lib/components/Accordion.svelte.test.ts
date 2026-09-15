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
		render(Accordion, { items });

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
		render(Accordion, { items });
		const buttonA = page.getByRole('button', { name: 'Frage A' });

		await userEvent.click(buttonA);
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'true');

		await userEvent.click(buttonA);
		await expect.element(buttonA).toHaveAttribute('aria-expanded', 'false');
	});
});
