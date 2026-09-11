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
	const vehicleDescriptionLine = `${input.make?.trim() || 'unbekannt'} (Farbe: ${input.color?.trim() || 'nicht angegeben'})`;
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
		postcode: input.addressPostcode,
		city: input.addressCity
	});
	const photoLine =
		input.photoCount > 1
			? `${input.photoCount} Beweisfotos sind dieser E-Mail beigefügt.`
			: 'Ein Beweisfoto ist dieser E-Mail beigefügt.';
	const timeLine = input.endTime?.trim()
		? `in der Zeit von ${input.time} Uhr bis ${input.endTime.trim()} Uhr`
		: `um ${input.time} Uhr`;
	const phoneLine = input.phone?.trim() ? ` sowie telefonisch unter ${input.phone.trim()}` : '';

	const body = `Sehr geehrte Damen und Herren,

hiermit zeige ich, ${input.firstName} ${input.lastName}, wohnhaft in ${addressLine}, an,
dass am ${formatGermanDate(input.date)} ${timeLine} in der ${locationLine} folgender Sachverhalt
vorlag:

${incidentDescriptions}

Art des Verstoßes: ${incidentLabels}
Kennzeichen des Fahrzeugs: ${licensePlateLine}
Fahrzeug: ${vehicleDescriptionLine}
${notes ? `Weitere Angaben: ${notes}\n\n` : ''}${photoLine}

Ich stehe für Rückfragen und ggf. als Zeuge zur Verfügung und bin unter dieser E-Mail-Adresse${phoneLine}
erreichbar.

Mit freundlichen Grüßen
${input.firstName} ${input.lastName}`;

	return { subject, body };
};
