import { describe, expect, it } from 'vitest';
import { describeHttpError } from './httpErrors';

describe('describeHttpError', () => {
	it('meldet Rate-Limiting bei HTTP 429', () => {
		expect(describeHttpError('LocationIQ', 429)).toBe(
			'LocationIQ hat Rate-Limiting gemeldet (HTTP 429)'
		);
	});

	it('meldet eine Blockierung bei HTTP 403', () => {
		expect(describeHttpError('BigDataCloud', 403)).toBe(
			'BigDataCloud hat die Anfrage blockiert (HTTP 403)'
		);
	});

	it('fällt bei anderen Statuscodes auf eine generische Meldung zurück', () => {
		expect(describeHttpError('LocationIQ', 500)).toBe('LocationIQ antwortete mit HTTP 500');
	});
});
