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

	it('nennt Verantwortlichen mit Name und Postanschrift sowie die Kontaktadressen', async () => {
		await render(DatenschutzPage);

		await expect.element(page.getByText('Alexander Fischenich')).toBeInTheDocument();
		await expect.element(page.getByText('Schwester-Firma-Weg 24')).toBeInTheDocument();
		await expect.element(page.getByText('51143 Köln')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'kontakt@appool.de' }))
			.toHaveAttribute('href', 'mailto:kontakt@appool.de');
		await expect
			.element(page.getByRole('link', { name: 'blitz-knoellchen@appool.de' }))
			.toHaveAttribute('href', 'mailto:blitz-knoellchen@appool.de');
	});

	it('enthält keine Telefonnummer und keine alte Kontaktadresse', async () => {
		await render(DatenschutzPage);

		const text = document.body.textContent ?? '';
		expect(text).not.toContain('pm.me');
		expect(text).not.toMatch(/Tel(efon)?[.:]/);
	});

	it('nennt Brevo (Sendinblue GmbH, Berlin) und Vercel als Dienstleister', async () => {
		await render(DatenschutzPage);

		const text = document.body.textContent ?? '';
		expect(text).toContain('Sendinblue GmbH, Berlin');
		expect(text).toContain('Vercel');
	});

	it('nennt Vercel Inc. (USA) mit Drittlandübermittlung und Auftragsverarbeitungsvertrag', async () => {
		await render(DatenschutzPage);

		const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
		expect(text).toContain('Vercel Inc.');
		expect(text).toContain('Data Privacy Framework');
		expect(text).toContain('Standardvertragsklauseln');
		expect(text).toContain('Auftragsverarbeitungsvertrag');
	});
});
