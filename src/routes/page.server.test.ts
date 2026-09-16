import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ EMAIL_FROM: 'absender@example.com' }));

const getRecipientEmailMock = vi.fn(
	(cityId: string, mode: string) => `${mode}@${cityId}.example.com`
);
vi.mock('$lib/config/cities.server', () => ({
	getRecipientEmail: (cityId: string, mode: string) => getRecipientEmailMock(cityId, mode)
}));

describe('+page.server.ts load', () => {
	it('liefert Empfänger- und Absender-E-Mails für die Köln-Stadt', async () => {
		const { load } = await import('./+page.server');
		const result = load({} as never);

		expect(result).toEqual({
			demoRecipientEmail: 'demo@koeln.example.com',
			liveRecipientEmail: 'live@koeln.example.com',
			senderEmail: 'absender@example.com'
		});
		expect(getRecipientEmailMock).toHaveBeenCalledWith('koeln', 'demo');
		expect(getRecipientEmailMock).toHaveBeenCalledWith('koeln', 'live');
	});
});
