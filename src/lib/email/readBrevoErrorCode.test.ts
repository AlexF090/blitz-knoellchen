import { describe, expect, it } from 'vitest';
import { readBrevoErrorCode } from './readBrevoErrorCode.ts';

describe('readBrevoErrorCode', () => {
	it('liefert nur den Fehlercode, nicht die Meldung', async () => {
		const response = new Response(
			JSON.stringify({ code: 'invalid_parameter', message: 'email melder@example.org is invalid' }),
			{ status: 400 }
		);

		await expect(readBrevoErrorCode(response)).resolves.toBe('invalid_parameter');
	});

	it.each([
		['kein JSON', '<html>Bad Gateway</html>'],
		['JSON ohne code', JSON.stringify({ message: 'kaputt' })],
		['code ist kein String', JSON.stringify({ code: 42 })],
		['JSON null', 'null']
	])('liefert „unbekannt“ bei %s', async (_description, body) => {
		await expect(readBrevoErrorCode(new Response(body, { status: 502 }))).resolves.toBe(
			'unbekannt'
		);
	});
});
