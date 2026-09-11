import { describe, expect, it } from 'vitest';
import { buildEmailBody } from './buildEmailBody';
import type { EmailTemplateInput } from '$lib/config/cities';

const baseInput: EmailTemplateInput = {
	firstName: 'Max',
	lastName: 'Mustermann',
	address: 'Musterstraße 1, 50667 Köln',
	date: '01.03.2026',
	time: '14:30',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	incidentTypes: [
		{ label: 'Parken auf dem Gehweg', description: 'Das Fahrzeug parkte auf dem Gehweg.' }
	],
	licensePlate: 'K-AB 1234',
	notes: 'Fahrzeug stand seit über einer Stunde dort.'
};

describe('buildEmailBody', () => {
	it('erzeugt Betreff und Text im Normalfall', () => {
		const result = buildEmailBody(baseInput);
		expect(result.subject).toBe('Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)');
		expect(result.body).toContain('Max Mustermann');
		expect(result.body).toContain('Musterstraße 1, 50667 Köln');
		expect(result.body).toContain('01.03.2026');
		expect(result.body).toContain('14:30');
		expect(result.body).toContain('Domkloster 4, 50667 Köln');
		expect(result.body).toContain('Parken auf dem Gehweg');
		expect(result.body).toContain('Das Fahrzeug parkte auf dem Gehweg.');
		expect(result.body).toContain('K-AB 1234');
		expect(result.body).toContain('Fahrzeug stand seit über einer Stunde dort.');
	});

	it('kombiniert mehrere Verstoßarten zu Label-Liste und Beschreibungs-Absätzen', () => {
		const result = buildEmailBody({
			...baseInput,
			incidentTypes: [
				{ label: 'Parken auf dem Gehweg', description: 'Das Fahrzeug parkte auf dem Gehweg.' },
				{
					label: 'Parken im Halteverbot',
					description: 'Das Fahrzeug parkte zusätzlich im Halteverbot.'
				}
			]
		});
		expect(result.body).toContain(
			'Art des Verstoßes: Parken auf dem Gehweg, Parken im Halteverbot'
		);
		expect(result.body).toContain('- Das Fahrzeug parkte auf dem Gehweg.');
		expect(result.body).toContain('- Das Fahrzeug parkte zusätzlich im Halteverbot.');
	});

	it('markiert fehlendes Kennzeichen als "nicht erfasst"', () => {
		const result = buildEmailBody({ ...baseInput, licensePlate: undefined });
		expect(result.body).toContain('Kennzeichen des Fahrzeugs: nicht erfasst');
	});

	it('setzt Platzhalter für fehlenden Freitext', () => {
		const result = buildEmailBody({ ...baseInput, notes: undefined });
		expect(result.body).toContain('Weitere Angaben: -');
	});

	it('baut die Tatort-Adresse auch ohne Hausnummer zusammen', () => {
		const result = buildEmailBody({ ...baseInput, locationHouseNumber: undefined });
		expect(result.body).toContain('in der Domkloster, 50667 Köln');
	});

	it('behält Sonderzeichen (ö/ä/ü/ß) korrekt bei', () => {
		const result = buildEmailBody({
			...baseInput,
			firstName: 'Björn',
			lastName: 'Müller-Straße',
			notes: 'Übermäßig groß, blockiert Gehweg vollständig.'
		});
		expect(result.body).toContain('Björn Müller-Straße');
		expect(result.body).toContain('Übermäßig groß, blockiert Gehweg vollständig.');
	});
});
