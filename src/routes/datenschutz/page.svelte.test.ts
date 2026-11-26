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

	const renderText = async () => {
		await render(DatenschutzPage);
		return (document.body.textContent ?? '').replace(/\s+/g, ' ');
	};

	it('nennt Brevo (Brevo GmbH, Berlin), Cloudflare und Geoapify als Dienstleister', async () => {
		const text = await renderText();

		expect(text).toContain('Brevo GmbH, Berlin');
		expect(text).toContain('Mit Brevo besteht ein Auftragsverarbeitungsvertrag');
		expect(text).toContain('Mit Hetzner besteht ein Auftragsverarbeitungsvertrag');
		expect(text).toContain('Cloudflare, Inc.');
		expect(text).toContain('Geoapify');
	});

	it('nennt Cloudflare mit Drittlandübermittlung und Auftragsverarbeitungsvertrag', async () => {
		const text = await renderText();

		expect(text).toContain('Data Privacy Framework');
		expect(text).toContain('Standardvertragsklauseln');
		expect(text).toContain('Auftragsverarbeitungsvertrag');
	});

	it('nennt keine früheren Dienstleister und keine Reichweitenmessung', async () => {
		const text = await renderText();

		expect(text).not.toContain('Vercel');
		expect(text).not.toContain('LocationIQ');
		expect(text).not.toContain('BigDataCloud');
		expect(text).toContain(
			'Eine Reichweitenmessung oder Analyse deines Nutzungsverhaltens findet nicht statt'
		);
	});

	it('nennt Widerspruchsrecht, zuständige Aufsichtsbehörde und Pflichtangaben nach Art. 13', async () => {
		const text = await renderText();

		expect(text).toContain('Widerspruchsrecht (Art. 21 DSGVO)');
		expect(text).toContain('LDI NRW');
		expect(text).toContain('Die Nutzung der App ist freiwillig');
		expect(text).toContain('automatisierte Entscheidungsfindung');
	});

	it('erklärt Demo-Modus und die fehlende Information der gemeldeten Person', async () => {
		const text = await renderText();

		expect(text).toContain('Demo-Modus');
		expect(text).toContain('Art. 14 Abs. 5 lit. b DSGVO');
	});

	it('nennt das Betreiber-Postfach bei Hetzner mit 6 Monaten Speicherdauer und Verjährung', async () => {
		await render(DatenschutzPage);

		const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
		expect(text).toContain('Hetzner Online GmbH');
		expect(text).toContain('werden nach 6 Monaten gelöscht');
		expect(text).toContain('§ 26 Abs. 3 StVG');
	});
});
