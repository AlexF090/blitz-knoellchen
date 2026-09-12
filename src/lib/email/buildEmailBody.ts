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
	const incidentDescriptions =
		input.incidentTypes.length > 1
			? `\n${input.incidentTypes.map((t) => `- ${t.description}`).join('\n')}`
			: input.incidentTypes[0].description;
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
		? `${input.time} Uhr bis ${input.endTime.trim()} Uhr`
		: `${input.time} Uhr`;
	const phoneLine = input.phone?.trim() ? `\nTelefon: ${input.phone.trim()}` : '';

	const introLine =
		input.incidentTypes.length > 1
			? 'hiermit zeige ich folgende Verkehrsverstöße an:'
			: 'hiermit zeige ich folgenden Verkehrsverstoß an:';

	const body = `Sehr geehrte Damen und Herren,

${introLine}

Angaben zur anzeigenden Person
Name: ${input.firstName} ${input.lastName}
Anschrift: ${addressLine}${phoneLine}

Tatzeit und Tatort
Datum: ${formatGermanDate(input.date)}
Uhrzeit: ${timeLine}
Tatort: ${locationLine}

Fahrzeug und Verstoß
Kennzeichen: ${licensePlateLine}
Länderkennzeichen: ${input.licensePlateCountry?.trim() || 'D'}
Fahrzeugart: ${input.vehicleType?.trim() || 'nicht angegeben'}
Fahrzeug: ${vehicleDescriptionLine}
Art des Verstoßes: ${incidentLabels}
Beschreibung: ${incidentDescriptions}
${notes ? `\nWeitere Angaben: ${notes}\n` : ''}
${photoLine}

Ich stehe für Rückfragen und gegebenenfalls als Zeuge zur Verfügung.

Mit freundlichen Grüßen
${input.firstName} ${input.lastName}`;

	return { subject, body };
};
