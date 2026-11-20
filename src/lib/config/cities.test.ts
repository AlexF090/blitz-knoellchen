import { describe, expect, it } from 'vitest';
import { buildEmailBody } from '$lib/email/buildEmailBody';
import { CITIES } from './cities';

describe('CITIES', () => {
	it('hat für jede Stadt eindeutige incidentTypes-IDs', () => {
		for (const city of Object.values(CITIES)) {
			const ids = city.incidentTypes.map((type) => type.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it('re-exportiert buildEmailBody unverändert', () => {
		expect(CITIES.koeln.buildEmailBody).toBe(buildEmailBody);
	});

	it('definiert für jede Verstoßart ein Label und eine Beschreibung', () => {
		for (const type of CITIES.koeln.incidentTypes) {
			expect(type.label.length).toBeGreaterThan(0);
			expect(type.description.length).toBeGreaterThan(0);
		}
	});

	it('formuliert Halteverbots-Verstöße passend zum Halte- oder Parkverstoß', () => {
		const haltingBanTypes = CITIES.koeln.incidentTypes.filter((type) =>
			type.label.startsWith('Halten/Parken')
		);
		expect(haltingBanTypes.map((type) => type.id)).toEqual([
			'gehweg',
			'halteverbot',
			'zweite-reihe',
			'feuerwehrzufahrt',
			'radweg'
		]);
		for (const type of haltingBanTypes) {
			expect(type.emailLabel).toContain('{Vorgang}');
			expect(type.description).toContain('{verb}');
		}
	});

	it('verwendet in Verstoßarten nur bekannte Platzhalter', () => {
		const knownPlaceholders = ['{verb}', '{Vorgang}'];
		for (const type of CITIES.koeln.incidentTypes) {
			const texts = [type.label, type.emailLabel ?? '', type.description];
			for (const placeholder of texts.flatMap((text) => text.match(/\{[^}]*\}/g) ?? [])) {
				expect(knownPlaceholders).toContain(placeholder);
			}
		}
	});
});
