import { json } from '@sveltejs/kit';
import { BREVO_API_KEY, EMAIL_FROM } from '$env/static/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import {
	buildEmailTemplateInput,
	resolveVehicleIncidentTypes
} from '$lib/email/buildEmailTemplateInput';
import { parseSendFormData } from '$lib/report/sendFormData';
import {
	validateReportForm,
	isFormValid,
	normalizeLicensePlate,
	type PhotoEntry,
	type ReportFormData,
	type VehicleEntry
} from '$lib/validation/formSchema';
import type { RequestHandler } from './$types';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const parsed = parseSendFormData(formData);

	const photos: PhotoEntry[] = parsed.photoBlobs.map((blob, index) => ({
		id: String(index),
		blob,
		fileName: `beweisfoto-${index + 1}.jpg`,
		gps: null,
		date: null,
		time: null
	}));
	// normalizeLicensePlate bleibt hier statt in parseSendFormData: die Rohangabe muss dort
	// unverändert bleiben, damit der Round-Trip-Test build->parse exakt das Eingabe-Objekt
	// zurückerhält.
	const vehicle: VehicleEntry = {
		id: '0',
		photoIds: photos.map((photo) => photo.id),
		...parsed.vehicle,
		licensePlate: normalizeLicensePlate(
			parsed.vehicle.licensePlate,
			parsed.vehicle.licensePlateCountry
		)
	};
	const { vehicleIndex, vehicleTotal, mode } = parsed;

	const data: ReportFormData = {
		...parsed.profile,
		photos,
		vehicles: [vehicle]
	};

	const errors = validateReportForm(data);
	if (!isFormValid(errors)) {
		return json({ error: 'Formulardaten sind ungültig.', errors }, { status: 400 });
	}

	const city = CITIES.koeln;
	const incidentTypes = resolveVehicleIncidentTypes(city, vehicle);
	if (incidentTypes.length !== vehicle.incidentTypeIds.length) {
		return json({ error: 'Unbekannte Verstoßart.' }, { status: 400 });
	}

	const { subject, body } = city.buildEmailBody(
		buildEmailTemplateInput({
			profile: data,
			vehicle,
			incidentTypes,
			photoCount: photos.length,
			vehicleIndex,
			vehicleTotal
		})
	);

	const attachment = await Promise.all(
		photos.map(async (photo) => ({
			name: photo.fileName,
			content: Buffer.from(await photo.blob.arrayBuffer()).toString('base64')
		}))
	);

	try {
		const response = await fetch(BREVO_SEND_URL, {
			method: 'POST',
			headers: {
				'api-key': BREVO_API_KEY,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				sender: { email: EMAIL_FROM },
				to: [{ email: getRecipientEmail(city.id, mode) }],
				replyTo: { email: data.email },
				bcc: [{ email: data.email }],
				subject,
				textContent: body,
				attachment
			})
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error('Brevo-Versand fehlgeschlagen:', response.status, errorBody);
			return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });
		}

		const result: { messageId?: string } = await response.json();
		console.log('Brevo-Versand erfolgreich, messageId:', result.messageId);

		return json({ ok: true });
	} catch {
		return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });
	}
};
