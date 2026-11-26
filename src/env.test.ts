import { describe, expect, it } from 'vitest';
import { parseOptionalPositiveInteger, parseOptionalString, parseOptionalUrl } from './env';

describe('parseOptionalUrl', () => {
	it('behandelt fehlende und leere Werte als nicht gesetzt', () => {
		expect(parseOptionalUrl(undefined)).toBeUndefined();
		expect(parseOptionalUrl('')).toBeUndefined();
	});

	it('übernimmt eine gültige URL unverändert', () => {
		expect(parseOptionalUrl('http://localhost:4010/v3/smtp/email')).toBe(
			'http://localhost:4010/v3/smtp/email'
		);
	});

	it('lehnt ungültige URLs ab', () => {
		expect(() => parseOptionalUrl('/v3/smtp/email')).toThrow('keine gültige URL');
	});
});

describe('parseOptionalPositiveInteger', () => {
	it('behandelt fehlende und leere Werte als nicht gesetzt', () => {
		expect(parseOptionalPositiveInteger(undefined)).toBeUndefined();
		expect(parseOptionalPositiveInteger('')).toBeUndefined();
	});

	it('liefert ganze Zahlen größer 0 als Zahl', () => {
		expect(parseOptionalPositiveInteger('1000')).toBe(1000);
	});

	it.each(['0', '-5', '2.5', 'zwanzig'])('lehnt „%s“ ab', (value) => {
		expect(() => parseOptionalPositiveInteger(value)).toThrow('keine ganze Zahl größer 0');
	});
});

describe('parseOptionalString', () => {
	it('behandelt fehlende und leere Werte als nicht gesetzt', () => {
		expect(parseOptionalString(undefined)).toBeUndefined();
		expect(parseOptionalString('')).toBeUndefined();
	});

	it('übernimmt einen Wert unverändert', () => {
		expect(parseOptionalString('preview')).toBe('preview');
	});
});
