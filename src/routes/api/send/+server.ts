import { json } from '@sveltejs/kit';
import { BREVO_API_KEY, EMAIL_FROM } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import {
	buildEmailTemplateInput,
	resolveVehicleIncidentTypes
} from '$lib/email/buildEmailTemplateInput';
import { hasJpegSignature } from '$lib/image/hasJpegSignature';
import { parseSendFormData } from '$lib/report/sendFormData';
import { createFixedWindowRateLimiter } from '$lib/server/fixedWindowRateLimiter';
import {
	validateReportForm,
	isFormValid,
	normalizeLicensePlate,
	type PhotoEntry,
	type ReportFormData,
	type VehicleEntry
} from '$lib/validation/formSchema';
import type { RequestHandler } from './$types';

// Nur für E2E-Tests überschreibbar (s. .env.example, playwright.config.ts) — zeigt dort auf einen
// lokalen Mock statt der echten Brevo-API, damit dieser Endpunkt real (inkl. Validierung,
// E-Mail-Aufbau) durchlaufen wird, ohne echte E-Mails zu versenden.
const BREVO_SEND_URL = env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';

// Die BCC-Kopie geht an die vom Client angegebene Adresse. Ohne Drosselung ließe sich der
// Endpunkt so als Relay an beliebige Adressen nutzen. Das Limit lebt im Speicher und gilt damit
// nur pro Serverless-Instanz: Es bremst ein einzelnes Skript, ist aber kein vollständiger Schutz.
// 20 pro Stunde lässt Raum für mehrere Fahrzeuge pro Anzeige und für Wiederholungen nach Fehlern.
// Überschreibbar nur für E2E-Tests, die alle von derselben IP aus senden.
const SEND_LIMIT_PER_HOUR = Number(env.SEND_LIMIT_PER_HOUR) || 20;
const sendRateLimiter = createFixedWindowRateLimiter({
	limit: SEND_LIMIT_PER_HOUR,
	windowMs: 60 * 60 * 1000
});

/**
 * Nimmt die Anzeige eines Fahrzeugs entgegen, validiert sie erneut serverseitig und verschickt
 * sie per Brevo an die Bußgeldstelle — mit dem Melder in Reply-To und bcc.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	if (!sendRateLimiter.tryConsume(getClientAddress())) {
		return json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }, { status: 429 });
	}

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

	// Erneute Validierung an der Trust-Boundary: die clientseitige Prüfung sagt nichts über
	// eine direkt an diesen Endpunkt gerichtete Anfrage aus.
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

	const photoBytes = await Promise.all(
		photos.map(async (photo) => new Uint8Array(await photo.blob.arrayBuffer()))
	);
	// Der Client schickt ausschließlich JPEGs (compressImage kodiert jedes Foto neu). Geprüft wird
	// der Inhalt, nicht nur der MIME-Typ: Den setzt der Client frei.
	const allPhotosAreJpeg = photos.every(
		(photo, index) => photo.blob.type === 'image/jpeg' && hasJpegSignature(photoBytes[index])
	);
	if (!allPhotosAreJpeg) {
		return json({ error: 'Nur JPEG-Fotos sind erlaubt.' }, { status: 400 });
	}

	const attachment = photos.map((photo, index) => ({
		name: photo.fileName,
		content: Buffer.from(photoBytes[index]).toString('base64')
	}));

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

		return json({ ok: true });
	} catch {
		// Details bewusst nicht an den Client: die Antwort ginge sonst mit Brevo-Interna an
		// einen Aufrufer, der damit ohnehin nichts anfangen kann.
		return json({ error: 'Versand fehlgeschlagen.' }, { status: 502 });
	}
};
