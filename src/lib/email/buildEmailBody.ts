import type { EmailTemplateInput } from '$lib/config/cities';
import { formatAddress } from '$lib/geocode/formatAddress';

export interface EmailContent {
	subject: string;
	body: string;
}

const SUBJECT_BASE = 'Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)';

const formatGermanDate = (isoDate: string): string => {
	const [year, month, day] = isoDate.split('-');
	return year && month && day ? `${day}.${month}.${year}` : isoDate;
};

export const buildEmailBody = (input: EmailTemplateInput): EmailContent => {
	const subject =
		input.vehicleTotal && input.vehicleTotal > 1
			? `${SUBJECT_BASE} – Fahrzeug ${input.vehicleIndex}/${input.vehicleTotal}`
			: SUBJECT_BASE;
	const licensePlateLine = input.licensePlate?.trim() ? input.licensePlate.trim() : 'nicht erfasst';
	const notes = input.notes?.trim();
	const incidentLabels = input.incidentTypes.map((t) => t.label).join(', ');
	const incidentDescriptions = input.incidentTypes.map((t) => `- ${t.description}`).join('\n');
	const locationLine = formatAddress({
		street: input.locationStreet,
		houseNumber: input.locationHouseNumber,
		postcode: input.locationPostcode,
		city: input.locationCity
	});
	const addressLine = formatAddress({
		street: input.addressStreet,
		houseNumber: input.addressHouseNumber,
		postcode: input.addressPostcode,
		city: input.addressCity
	});
	const photoLine =
		input.photoCount > 1
			? `${input.photoCount} Beweisfotos sind dieser E-Mail beigefügt.`
			: 'Ein Beweisfoto ist dieser E-Mail beigefügt.';

	const body = `Sehr geehrte Damen und Herren,

hiermit zeige ich, ${input.firstName} ${input.lastName}, wohnhaft in ${addressLine}, an,
dass am ${formatGermanDate(input.date)} um ${input.time} Uhr in der ${locationLine} folgender Sachverhalt
vorlag:

${incidentDescriptions}

Art des Verstoßes: ${incidentLabels}
Kennzeichen des Fahrzeugs: ${licensePlateLine}
${notes ? `Weitere Angaben: ${notes}\n\n` : ''}${photoLine}

Ich stehe für Rückfragen und ggf. als Zeuge zur Verfügung und bin unter dieser E-Mail-Adresse
erreichbar.

Mit freundlichen Grüßen
${input.firstName} ${input.lastName}`;

	return { subject, body };
};
