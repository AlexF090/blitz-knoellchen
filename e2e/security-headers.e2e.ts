import { test, expect } from './fixtures';

test('liefert HTML-Seiten mit Content-Security-Policy und Sicherheits-Headern aus', async ({
	request
}) => {
	const response = await request.get('/');
	const headers = response.headers();

	expect(headers['content-security-policy']).toContain("default-src 'self'");
	expect(headers['content-security-policy']).toContain("worker-src 'self' blob:");
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['permissions-policy']).toContain('geolocation=()');
});

test('setzt die Sicherheits-Header auch auf API-Antworten', async ({ request }) => {
	// GET ist für /api/send nicht erlaubt: Die Fehlerantwort läuft trotzdem durch den handle-Hook.
	const response = await request.get('/api/send');
	const headers = response.headers();

	expect(response.ok()).toBe(false);
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});
