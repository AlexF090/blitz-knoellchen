import { describe, expect, it } from 'vitest';
import { handle } from './hooks.server';

describe('handle (Security-Header)', () => {
	it('setzt X-Frame-Options und COOP auf jeder Antwort', async () => {
		const resolve = async () => new Response('ok');

		const response = await handle({ resolve } as unknown as Parameters<typeof handle>[0]);

		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
	});
});
