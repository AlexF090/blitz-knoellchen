import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({
	RECIPIENT_EMAIL_DEMO: 'demo@example.com',
	RECIPIENT_EMAIL_LIVE: 'live@example.com'
}));

describe('getRecipientEmail', () => {
	it('liefert die Demo-Empfänger-E-Mail für eine bekannte Stadt', async () => {
		const { getRecipientEmail } = await import('./cities.server');
		expect(getRecipientEmail('koeln', 'demo')).toBe('demo@example.com');
	});

	it('liefert die Live-Empfänger-E-Mail für eine bekannte Stadt', async () => {
		const { getRecipientEmail } = await import('./cities.server');
		expect(getRecipientEmail('koeln', 'live')).toBe('live@example.com');
	});

	it('wirft bei einer unbekannten Stadt im Demo-Modus', async () => {
		const { getRecipientEmail } = await import('./cities.server');
		expect(() => getRecipientEmail('unbekannt', 'demo')).toThrow(
			'Keine demo-Empfänger-E-Mail für Stadt "unbekannt" konfiguriert.'
		);
	});

	it('wirft bei einer unbekannten Stadt im Live-Modus', async () => {
		const { getRecipientEmail } = await import('./cities.server');
		expect(() => getRecipientEmail('unbekannt', 'live')).toThrow(
			'Keine live-Empfänger-E-Mail für Stadt "unbekannt" konfiguriert.'
		);
	});
});
