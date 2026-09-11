import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_FROM } from '$env/static/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import { validateReportForm, isFormValid, type ReportFormData } from '$lib/validation/formSchema';
import type { RequestHandler } from './$types';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();

	const data: ReportFormData = {
		firstName: String(formData.get('firstName') ?? ''),
		lastName: String(formData.get('lastName') ?? ''),
		address: String(formData.get('address') ?? ''),
		email: String(formData.get('email') ?? ''),
		date: String(formData.get('date') ?? ''),
		time: String(formData.get('time') ?? ''),
		locationAddress: String(formData.get('locationAddress') ?? ''),
		incidentTypeIds: formData.getAll('incidentTypeIds').map(String),
		licensePlate: String(formData.get('licensePlate') ?? '') || undefined,
		notes: String(formData.get('notes') ?? '') || undefined
	};

	const errors = validateReportForm(data);
	if (!isFormValid(errors)) {
		return json({ error: 'Formulardaten sind ungültig.', errors }, { status: 400 });
	}

	const photo = formData.get('photo');
	if (!(photo instanceof Blob)) {
		return json({ error: 'Beweisfoto fehlt.' }, { status: 400 });
	}

	const city = CITIES.koeln;
	const incidentTypes = city.incidentTypes.filter((t) => data.incidentTypeIds.includes(t.id));
	if (incidentTypes.length !== data.incidentTypeIds.length) {
		return json({ error: 'Unbekannte Verstoßart.' }, { status: 400 });
	}

	const { subject, body } = city.buildEmailBody({
		firstName: data.firstName,
		lastName: data.lastName,
		address: data.address,
		date: data.date,
		time: data.time,
		locationAddress: data.locationAddress,
		incidentTypes: incidentTypes.map((t) => ({ label: t.label, description: t.description })),
		licensePlate: data.licensePlate,
		notes: data.notes
	});

	const photoBuffer = Buffer.from(await photo.arrayBuffer());

	try {
		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: getRecipientEmail(city.id),
			replyTo: data.email,
			bcc: data.email,
			subject,
			text: body,
			attachments: [{ filename: 'beweisfoto.jpg', content: photoBuffer }]
		});

		if (error) return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });

		return json({ ok: true });
	} catch {
		return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });
	}
};
