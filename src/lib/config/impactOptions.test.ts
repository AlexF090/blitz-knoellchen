import { describe, expect, it } from 'vitest';
import {
	ENDANGERED_PERSON_OPTIONS,
	IMPAIRMENT_OPTIONS,
	resolveImpactOptions
} from './impactOptions';

describe('Auswahllisten', () => {
	it.each([
		['IMPAIRMENT_OPTIONS', IMPAIRMENT_OPTIONS],
		['ENDANGERED_PERSON_OPTIONS', ENDANGERED_PERSON_OPTIONS]
	])('%s hat eindeutige ids', (_name, options) => {
		const ids = options.map((option) => option.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('Behinderungs-Sätze enden mit einem Punkt', () => {
		for (const option of IMPAIRMENT_OPTIONS) expect(option.emailText.endsWith('.')).toBe(true);
	});
});

describe('resolveImpactOptions', () => {
	it('behält die Reihenfolge der Konfiguration', () => {
		const result = resolveImpactOptions(IMPAIRMENT_OPTIONS, ['sicht-verdeckt', 'gehweg-blockiert']);
		expect(result.map((option) => option.id)).toEqual(['gehweg-blockiert', 'sicht-verdeckt']);
	});

	it('verwirft unbekannte ids', () => {
		expect(resolveImpactOptions(IMPAIRMENT_OPTIONS, ['gibt-es-nicht'])).toEqual([]);
	});

	it('entfernt Duplikate', () => {
		const result = resolveImpactOptions(ENDANGERED_PERSON_OPTIONS, ['radfahrende', 'radfahrende']);
		expect(result).toHaveLength(1);
	});
});
