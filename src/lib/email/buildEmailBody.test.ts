import { describe, expect, it } from 'vitest';
import { buildEmailBody } from './buildEmailBody';
import type { EmailTemplateInput } from '$lib/config/cities';

const baseInput: EmailTemplateInput = {
	firstName: 'Max',
	lastName: 'Mustermann',
	addressStreet: 'Musterstraße 1',
	addressPostcode: '50667',
	addressCity: 'Köln',
	date: '2026-03-01',
	time: '14:30',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	incidentTypes: [
		{ label: 'Parken auf dem Gehweg', description: 'Das Fahrzeug parkte auf dem Gehweg.' }
	],
	licensePlate: 'K-AB 1234',
	make: 'VW',
	color: 'Rot',
	notes: 'Fahrzeug stand seit über einer Stunde dort.',
	photoCount: 1
};

describe('buildEmailBody', () => {
	it('erzeugt Betreff und Text im Normalfall', () => {
		const result = buildEmailBody(baseInput);
		expect(result.subject).toBe('Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)');
		expect(result.body).toContain('Name: Max Mustermann');
		expect(result.body).toContain('Anschrift: Musterstraße 1, 50667 Köln');
		expect(result.body).toContain('Datum: 01.03.2026');
		expect(result.body).toContain('Uhrzeit: 14:30 Uhr');
		expect(result.body).toContain('Tatort: Domkloster 4, 50667 Köln');
		expect(result.body).toContain('Art des Verstoßes: Parken auf dem Gehweg');
		expect(result.body).toContain('Beschreibung: Das Fahrzeug parkte auf dem Gehweg.');
		expect(result.body).toContain('Kennzeichen: K-AB 1234');
		expect(result.body).toContain('Fahrzeug: VW (Farbe: Rot)');
		expect(result.body).toContain('Weitere Angaben: Fahrzeug stand seit über einer Stunde dort.');
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
		expect(result.body).toContain('hiermit zeige ich folgende Verkehrsverstöße an:');
		expect(result.body).toContain(
			'Art des Verstoßes: Parken auf dem Gehweg, Parken im Halteverbot'
		);
		expect(result.body).toContain('- Das Fahrzeug parkte auf dem Gehweg.');
		expect(result.body).toContain('- Das Fahrzeug parkte zusätzlich im Halteverbot.');
	});

	it('formuliert den Einleitungssatz bei nur einer Verstoßart im Singular', () => {
		const result = buildEmailBody(baseInput);
		expect(result.body).toContain('hiermit zeige ich folgenden Verkehrsverstoß an:');
	});

	it('markiert fehlendes Kennzeichen als "nicht erfasst"', () => {
		const result = buildEmailBody({ ...baseInput, licensePlate: undefined });
		expect(result.body).toContain('Kennzeichen: nicht erfasst');
	});

	it('lässt die Zeile "Weitere Angaben" bei fehlendem Freitext ganz weg', () => {
		const result = buildEmailBody({ ...baseInput, notes: undefined });
		expect(result.body).not.toContain('Weitere Angaben');
	});

	it('baut die Tatort-Adresse auch ohne Hausnummer zusammen', () => {
		const result = buildEmailBody({ ...baseInput, locationHouseNumber: undefined });
		expect(result.body).toContain('Tatort: Domkloster, 50667 Köln');
	});

	it('erwähnt ein einzelnes Beweisfoto im Singular', () => {
		const result = buildEmailBody(baseInput);
		expect(result.body).toContain('Ein Beweisfoto ist dieser E-Mail beigefügt.');
	});

	it('erwähnt mehrere Beweisfotos im Plural mit Anzahl', () => {
		const result = buildEmailBody({ ...baseInput, photoCount: 3 });
		expect(result.body).toContain('3 Beweisfotos sind dieser E-Mail beigefügt.');
	});

	it('behält den normalen Betreff bei nur einem Fahrzeug', () => {
		const result = buildEmailBody({ ...baseInput, vehicleIndex: 1, vehicleTotal: 1 });
		expect(result.subject).toBe('Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)');
	});

	it('ergänzt den Betreff um Fahrzeug-Index bei mehreren Fahrzeugen', () => {
		const result = buildEmailBody({ ...baseInput, vehicleIndex: 2, vehicleTotal: 3 });
		expect(result.subject).toBe(
			'Anzeige einer Verkehrsordnungswidrigkeit (Falschparken) – Fahrzeug 2/3'
		);
	});

	it('erwähnt die Telefonnummer als eigene Zeile, wenn angegeben', () => {
		const result = buildEmailBody({ ...baseInput, phone: '0221 12345678' });
		expect(result.body).toContain('Telefon: 0221 12345678');
	});

	it('lässt die Telefon-Zeile bei fehlender Nummer weg', () => {
		const result = buildEmailBody({ ...baseInput, phone: undefined });
		expect(result.body).not.toContain('Telefon:');
	});

	it('formuliert einen Zeitraum, wenn endTime gesetzt ist', () => {
		const result = buildEmailBody({ ...baseInput, time: '14:00', endTime: '14:10' });
		expect(result.body).toContain('Uhrzeit: 14:00 Uhr bis 14:10 Uhr');
	});

	it('formuliert einen Einzelzeitpunkt ohne endTime', () => {
		const result = buildEmailBody({ ...baseInput, endTime: undefined });
		expect(result.body).toContain('Uhrzeit: 14:30 Uhr');
		expect(result.body).not.toContain('bis');
	});

	it('fällt bei fehlender Marke/Farbe auf Platzhaltertext zurück', () => {
		const result = buildEmailBody({ ...baseInput, make: undefined, color: undefined });
		expect(result.body).toContain('Fahrzeug: unbekannt (Farbe: nicht angegeben)');
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
