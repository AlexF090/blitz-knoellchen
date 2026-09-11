import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_FROM } from '$env/static/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import {
	validateReportForm,
	isFormValid,
	type PhotoEntry,
	type ReportFormData,
	type VehicleEntry
} from '$lib/validation/formSchema';
import type { RequestHandler } from './$types';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();

	const photoBlobs = formData.getAll('photos').filter((p): p is File => p instanceof File);
	const photos: PhotoEntry[] = photoBlobs.map((blob, index) => ({
		id: String(index),
		blob,
		fileName: `beweisfoto-${index + 1}.jpg`
	}));
	const vehicle: VehicleEntry = {
		id: '0',
		photoIds: photos.map((photo) => photo.id),
		licensePlate: String(formData.get('licensePlate') ?? ''),
		incidentTypeIds: formData.getAll('incidentTypeIds').map(String),
		notes: String(formData.get('notes') ?? '') || undefined
	};
	const vehicleIndex = Number(formData.get('vehicleIndex') ?? '1');
	const vehicleTotal = Number(formData.get('vehicleTotal') ?? '1');

	const data: ReportFormData = {
		firstName: String(formData.get('firstName') ?? ''),
		lastName: String(formData.get('lastName') ?? ''),
		addressStreet: String(formData.get('addressStreet') ?? ''),
		addressHouseNumber: String(formData.get('addressHouseNumber') ?? '') || undefined,
		addressPostcode: String(formData.get('addressPostcode') ?? ''),
		addressCity: String(formData.get('addressCity') ?? ''),
		email: String(formData.get('email') ?? ''),
		date: String(formData.get('date') ?? ''),
		time: String(formData.get('time') ?? ''),
		locationStreet: String(formData.get('locationStreet') ?? ''),
		locationHouseNumber: String(formData.get('locationHouseNumber') ?? '') || undefined,
		locationPostcode: String(formData.get('locationPostcode') ?? ''),
		locationCity: String(formData.get('locationCity') ?? ''),
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
		addressHouseNumber: data.addressHouseNumber,
		addressPostcode: data.addressPostcode,
		addressCity: data.addressCity,
		date: data.date,
		time: data.time,
		locationStreet: data.locationStreet,
		locationHouseNumber: data.locationHouseNumber,
		locationPostcode: data.locationPostcode,
		locationCity: data.locationCity,
		incidentTypes: incidentTypes.map((t) => ({ label: t.label, description: t.description })),
		licensePlate: vehicle.licensePlate,
		notes: vehicle.notes,
		photoCount: photos.length,
		vehicleIndex,
		vehicleTotal
	});

	const attachments = await Promise.all(
		photos.map(async (photo) => ({
			filename: photo.fileName,
			content: Buffer.from(await photo.blob.arrayBuffer())
		}))
	);

	try {
		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: getRecipientEmail(city.id),
			replyTo: data.email,
			bcc: data.email,
			subject,
			text: body,
			attachments
		});

		if (error) return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });

		return json({ ok: true });
	} catch {
		return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });
	}
};
