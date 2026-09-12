import { json } from '@sveltejs/kit';
import { BREVO_API_KEY, EMAIL_FROM } from '$env/static/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
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

	const photoBlobs = formData.getAll('photos').filter((p): p is File => p instanceof File);
	const photos: PhotoEntry[] = photoBlobs.map((blob, index) => ({
		id: String(index),
		blob,
		fileName: `beweisfoto-${index + 1}.jpg`,
		gps: null,
		date: null,
		time: null
	}));
	const timeMode = formData.get('timeMode') === 'parkverstoss' ? 'parkverstoss' : 'halteverstoss';
	const vehicle: VehicleEntry = {
		id: '0',
		photoIds: photos.map((photo) => photo.id),
		licensePlate: normalizeLicensePlate(String(formData.get('licensePlate') ?? '')),
		licensePlateCountry: String(formData.get('licensePlateCountry') ?? ''),
		vehicleType: String(formData.get('vehicleType') ?? ''),
		make: String(formData.get('make') ?? ''),
		color: String(formData.get('color') ?? ''),
		incidentTypeIds: formData.getAll('incidentTypeIds').map(String),
		notes: String(formData.get('notes') ?? '') || undefined,
		date: String(formData.get('date') ?? ''),
		time: String(formData.get('time') ?? ''),
		timeMode,
		endTime: String(formData.get('endTime') ?? '') || undefined,
		locationStreet: String(formData.get('locationStreet') ?? ''),
		locationHouseNumber: String(formData.get('locationHouseNumber') ?? '') || undefined,
		locationPostcode: String(formData.get('locationPostcode') ?? ''),
		locationCity: String(formData.get('locationCity') ?? '')
	};
	const vehicleIndex = Number(formData.get('vehicleIndex') ?? '1');
	const vehicleTotal = Number(formData.get('vehicleTotal') ?? '1');

	const data: ReportFormData = {
		firstName: String(formData.get('firstName') ?? ''),
		lastName: String(formData.get('lastName') ?? ''),
		addressStreet: String(formData.get('addressStreet') ?? ''),
		addressPostcode: String(formData.get('addressPostcode') ?? ''),
		addressCity: String(formData.get('addressCity') ?? ''),
		email: String(formData.get('email') ?? ''),
		phone: String(formData.get('phone') ?? '') || undefined,
		photos,
		vehicles: [vehicle]
	};

	const errors = validateReportForm(data);
	if (!isFormValid(errors)) {
		return json({ error: 'Formulardaten sind ungültig.', errors }, { status: 400 });
	}

	const city = CITIES.koeln;
	const incidentTypes = city.incidentTypes.filter((t) => vehicle.incidentTypeIds.includes(t.id));
	if (incidentTypes.length !== vehicle.incidentTypeIds.length) {
		return json({ error: 'Unbekannte Verstoßart.' }, { status: 400 });
	}

	const { subject, body } = city.buildEmailBody({
		firstName: data.firstName,
		lastName: data.lastName,
		addressStreet: data.addressStreet,
		addressPostcode: data.addressPostcode,
		addressCity: data.addressCity,
		phone: data.phone,
		date: vehicle.date,
		time: vehicle.time,
		endTime: vehicle.endTime,
		locationStreet: vehicle.locationStreet,
		locationHouseNumber: vehicle.locationHouseNumber,
		locationPostcode: vehicle.locationPostcode,
		locationCity: vehicle.locationCity,
		incidentTypes: incidentTypes.map((t) => ({ label: t.label, description: t.description })),
		licensePlate: vehicle.licensePlate,
		licensePlateCountry: vehicle.licensePlateCountry,
		vehicleType: vehicle.vehicleType,
		make: vehicle.make,
		color: vehicle.color,
		notes: vehicle.notes,
		photoCount: photos.length,
		vehicleIndex,
		vehicleTotal
	});

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
				to: [{ email: getRecipientEmail(city.id) }],
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
