import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from './$types';

vi.mock('$env/static/private', () => ({
	BREVO_API_KEY: 'test-brevo-key',
	EMAIL_FROM: 'absender@example.com'
}));

const getRecipientEmailMock = vi.fn((cityId: string, mode: string) => {
	void cityId;
	void mode;
	return 'empfaenger@example.com';
});
vi.mock('$lib/config/cities.server', () => ({
	getRecipientEmail: (cityId: string, mode: string) => getRecipientEmailMock(cityId, mode)
}));

const VALID_FIELDS: Record<string, string> = {
	firstName: 'Max',
	lastName: 'Mustermann',
	addressStreet: 'Musterstraße 1',
	addressPostcode: '50667',
	addressCity: 'Köln',
	email: 'max@example.com',
	date: '2020-01-05',
	time: '12:00',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationPostcode: '50667',
	locationCity: 'Köln',
	vehicleIndex: '1',
	vehicleTotal: '1',
	licensePlate: 'K-AB 1234',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'BMW',
	color: 'Rot',
	mode: 'demo'
};

const buildFormData = (
	overrides: Record<string, string | null> = {},
	withPhoto = true
): FormData => {
	const formData = new FormData();
	for (const [key, value] of Object.entries({ ...VALID_FIELDS, ...overrides })) {
		if (value === null) continue;
		formData.set(key, value);
	}
	formData.append('incidentTypeIds', 'gehweg');
	if (withPhoto) {
		formData.append('photos', new Blob(['x'], { type: 'image/jpeg' }), 'foto.jpg');
	}
	return formData;
};

const buildEvent = (formData: FormData): RequestEvent =>
	({
		request: { formData: async () => formData } as unknown as Request
	}) as unknown as RequestEvent;

describe('POST /api/send', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('liefert 400 mit Fehlern bei ungültigen Formulardaten', async () => {
		const { POST } = await import('./+server');
		const response = await POST(buildEvent(buildFormData({ firstName: '' })) as never);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Formulardaten sind ungültig.');
		expect(body.errors.firstName).toBeDefined();
	});

	it('liefert 400 bei unbekannter Verstoßart', async () => {
		const { POST } = await import('./+server');
		const formData = buildFormData();
		formData.delete('incidentTypeIds');
		formData.append('incidentTypeIds', 'unbekannte-art');

		const response = await POST(buildEvent(formData) as never);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'Unbekannte Verstoßart.' });
	});

	it('sendet bei gültigen Daten an Brevo und liefert ok:true', async () => {
		const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
			void url;
			void init;
			return new Response(null, { status: 201 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const { POST } = await import('./+server');
		const response = await POST(buildEvent(buildFormData()) as never);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.brevo.com/v3/smtp/email');
		const headers = init.headers as Record<string, string>;
		expect(headers['api-key']).toBe('test-brevo-key');

		const payload = JSON.parse(init.body as string);
		expect(payload.sender).toEqual({ email: 'absender@example.com' });
		expect(payload.to).toEqual([{ email: 'empfaenger@example.com' }]);
		expect(payload.replyTo).toEqual({ email: 'max@example.com' });
		expect(payload.bcc).toEqual([{ email: 'max@example.com' }]);
		expect(payload.attachment).toHaveLength(1);
		expect(payload.attachment[0].name).toBe('beweisfoto-1.jpg');
		expect(getRecipientEmailMock).toHaveBeenCalledWith('koeln', 'demo');
	});

	it('liefert 502, wenn Brevo mit einem Fehlerstatus antwortet', async () => {
		const fetchMock = vi.fn(
			async () => new Response('Bad request', { status: 400, statusText: 'Bad Request' })
		);
		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const { POST } = await import('./+server');
		const response = await POST(buildEvent(buildFormData()) as never);

		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({ error: 'Versand fehlgeschlagen.' });
	});

	it('liefert 502, wenn der Brevo-Request eine Exception wirft', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('Netzwerkfehler');
			})
		);

		const { POST } = await import('./+server');
		const response = await POST(buildEvent(buildFormData()) as never);

		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({ error: 'Versand fehlgeschlagen.' });
	});
});
