import { describe, expect, it } from 'vitest';
import { describeHttpError } from './httpErrors';

describe('describeHttpError', () => {
	it('meldet Rate-Limiting bei HTTP 429', () => {
		expect(describeHttpError('Geoapify', 429)).toBe(
			'Geoapify hat Rate-Limiting gemeldet (HTTP 429)'
		);
	});

	it('meldet eine Blockierung bei HTTP 403', () => {
		expect(describeHttpError('Geoapify', 403)).toBe(
			'Geoapify hat die Anfrage blockiert (HTTP 403)'
		);
	});

	it('fällt bei anderen Statuscodes auf eine generische Meldung zurück', () => {
		expect(describeHttpError('Geoapify', 500)).toBe('Geoapify antwortete mit HTTP 500');
	});
});
