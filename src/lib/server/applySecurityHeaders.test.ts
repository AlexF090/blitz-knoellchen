import { describe, expect, it } from 'vitest';
import { applySecurityHeaders } from './applySecurityHeaders';

describe('applySecurityHeaders', () => {
	it.each([
		['HTML', new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })],
		['JSON', Response.json({ ok: true })],
		['Fehler', Response.json({ error: 'Versand fehlgeschlagen.' }, { status: 502 })]
	])('setzt alle Sicherheits-Header auf eine %s-Antwort', (_kind, response) => {
		applySecurityHeaders(response.headers);

		expect(Object.fromEntries(response.headers)).toMatchObject({
			'x-frame-options': 'DENY',
			'cross-origin-opener-policy': 'same-origin',
			'x-content-type-options': 'nosniff',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
		});
	});
});
