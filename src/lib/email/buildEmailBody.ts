import type { EmailTemplateInput } from '$lib/config/cities';
import { formatIsoDateDMY } from '$lib/format/germanDate';
import { formatAddress } from '$lib/geocode/formatAddress';

export interface EmailContent {
	subject: string;
	body: string;
}

const SUBJECT_BASE = 'Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)';

export const buildEmailBody = (input: EmailTemplateInput): EmailContent => {
	const licensePlateLine = input.licensePlate?.trim() ? input.licensePlate.trim() : 'nicht erfasst';
	// Kennzeichen + Datum im Betreff, statt eines immer identischen Basistexts: hilft sowohl der
	// Bußgeldstelle beim Zuordnen eingehender Mails als auch dem Melder selbst, mehrere Anzeigen
	// in der eigenen bcc-Kopie auseinanderzuhalten. Tatort/Uhrzeit bewusst weggelassen, um den
	// Betreff nicht unübersichtlich lang zu machen.
	const vehicleSuffix =
		input.vehicleTotal && input.vehicleTotal > 1
			? ` (Fahrzeug ${input.vehicleIndex}/${input.vehicleTotal})`
			: '';
	const subject = `${SUBJECT_BASE} – ${licensePlateLine}, ${formatIsoDateDMY(input.date)}${vehicleSuffix}`;
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
	const descriptionLabel = input.incidentTypes.length > 1 ? 'Beschreibung:' : 'Beschreibung: ';

	const introLine =
		input.incidentTypes.length > 1
			? 'hiermit zeige ich folgende Verkehrsverstöße an.'
			: 'hiermit zeige ich folgenden Verkehrsverstoß an.';

	const body = `Sehr geehrte Damen und Herren,

${introLine}

Angaben zu mir:
Name: ${input.firstName} ${input.lastName}
Anschrift: ${addressLine}${phoneLine}

Tatzeit und Tatort
Datum: ${formatIsoDateDMY(input.date)}
Uhrzeit: ${timeLine}
Tatort: ${locationLine}

Fahrzeug und Verstoß
Kennzeichen: ${licensePlateLine}
Länderkennzeichen: ${input.licensePlateCountry?.trim() || 'D'}
Fahrzeugart: ${input.vehicleType?.trim() || 'nicht angegeben'}
Fahrzeug: ${vehicleDescriptionLine}
Art des Verstoßes: ${incidentLabels}
${descriptionLabel}${incidentDescriptions}
${notes ? `\nWeitere Angaben: ${notes}\n` : ''}
${photoLine}

Ich stehe für Rückfragen und gegebenenfalls als Zeuge zur Verfügung.

Mit freundlichen Grüßen
${input.firstName} ${input.lastName}`;

	return { subject, body };
};
