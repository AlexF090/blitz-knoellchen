import type { EmailTemplateInput } from '$lib/config/cities';
import { formatAddress } from '$lib/geocode/formatAddress';

export interface EmailContent {
	subject: string;
	body: string;
}

const SUBJECT = 'Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)';

export function buildEmailBody(input: EmailTemplateInput): EmailContent {
	const licensePlateLine = input.licensePlate?.trim() ? input.licensePlate.trim() : 'nicht erfasst';
	const notesLine = input.notes?.trim() ? input.notes.trim() : '-';
	const incidentLabels = input.incidentTypes.map((t) => t.label).join(', ');
	const incidentDescriptions = input.incidentTypes.map((t) => `- ${t.description}`).join('\n');
	const locationLine = formatAddress({
		street: input.locationStreet,
		houseNumber: input.locationHouseNumber,
		postcode: input.locationPostcode,
		city: input.locationCity
	});

	const body = `Sehr geehrte Damen und Herren,

hiermit zeige ich, ${input.firstName} ${input.lastName}, wohnhaft in ${input.address}, an,
dass am ${input.date} um ${input.time} Uhr in der ${locationLine} folgender Sachverhalt
vorlag:

${incidentDescriptions}

Art des Verstoßes: ${incidentLabels}
Kennzeichen des Fahrzeugs: ${licensePlateLine}
Weitere Angaben: ${notesLine}

Ein Beweisfoto ist dieser E-Mail beigefügt.

Ich stehe für Rückfragen und ggf. als Zeuge zur Verfügung und bin unter dieser E-Mail-Adresse
erreichbar.

Mit freundlichen Grüßen
${input.firstName} ${input.lastName}`;

	return { subject: SUBJECT, body };
}
