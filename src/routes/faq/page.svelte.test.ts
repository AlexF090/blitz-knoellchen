import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FaqPage from './+page.svelte';

describe('FAQ-Seite', () => {
	it('rendert die Überschrift und öffnet eine Frage per Klick', async () => {
		await render(FaqPage);

		await expect.element(page.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();

		const question = page.getByRole('button', {
			name: 'Was macht diese App, und muss ich dafür bezahlen?'
		});
		await expect.element(question).toHaveAttribute('aria-expanded', 'false');

		await userEvent.click(question);
		await expect.element(question).toHaveAttribute('aria-expanded', 'true');
	});

	it('öffnet jede Frage beider Themenblöcke und zeigt die jeweilige Antwort', async () => {
		await render(FaqPage);

		const questions = [
			'Was macht diese App, und muss ich dafür bezahlen?',
			'Kann ich mehrere Falschparker oder Fahrzeuge in einem Durchgang melden?',
			'Was passiert, nachdem ich die Anzeige abgeschickt habe?',
			'Wer ist verantwortlich, und welche Daten verarbeitet die App überhaupt?',
			'Wer bekommt welche Daten, wo werden sie gespeichert und wie lange?',
			'Verlässt mein Foto mein Gerät, und woher weiß die App, wo der Verstoß war?',
			'Was passiert mit meinen Daten beim Versand, und speichert die App etwas lokal?'
		];

		for (const name of questions) {
			const question = page.getByRole('button', { name });
			await userEvent.click(question);
			await expect.element(question).toHaveAttribute('aria-expanded', 'true');
		}
	});
});
