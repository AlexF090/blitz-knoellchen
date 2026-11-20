import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CITIES } from './cities';
import { INCIDENT_TYPE_ICONS } from './incidentTypeIcons';

const staticFile = (src: string) =>
	fileURLToPath(new URL(`../../../static${src}`, import.meta.url));

describe('INCIDENT_TYPE_ICONS', () => {
	it('hat für jede Verstoßart jeder Stadt ein Icon', () => {
		for (const city of Object.values(CITIES)) {
			for (const type of city.incidentTypes) {
				expect(INCIDENT_TYPE_ICONS[type.id], type.id).toBeDefined();
			}
		}
	});

	it('enthält keine Icons für unbekannte Verstoßarten', () => {
		const knownIds = new Set(
			Object.values(CITIES).flatMap((city) => city.incidentTypes.map((type) => type.id))
		);
		for (const id of Object.keys(INCIDENT_TYPE_ICONS)) {
			expect(knownIds.has(id), id).toBe(true);
		}
	});

	it('verweist bei Verkehrszeichen auf eine vorhandene Datei unter static/signs', () => {
		const signs = Object.values(INCIDENT_TYPE_ICONS).filter((icon) => icon?.kind === 'sign');
		expect(signs.length).toBeGreaterThan(0);
		for (const icon of signs) {
			expect(icon.src).toMatch(/^\/signs\/.+\.svg$/);
			expect(existsSync(staticFile(icon.src)), icon.src).toBe(true);
		}
	});

	it('zeigt Halteverbot und Parkverbot als Verkehrszeichen 283 und 286', () => {
		expect(INCIDENT_TYPE_ICONS.halteverbot).toEqual({
			kind: 'sign',
			src: '/signs/zeichen-283-halteverbot.svg'
		});
		expect(INCIDENT_TYPE_ICONS.parkverbot).toEqual({
			kind: 'sign',
			src: '/signs/zeichen-286-parkverbot.svg'
		});
	});
});
