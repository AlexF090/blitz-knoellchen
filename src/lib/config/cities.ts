import { buildEmailBody } from '$lib/email/buildEmailBody';

/**
 * Eine auswählbare Verstoßart mit Formular-Label und E-Mail-Satz.
 *
 * `label`, `emailLabel` und `description` dürfen die Platzhalter `{verb}` („hielt"/„parkte") und
 * `{Vorgang}` („Halten"/„Parken") enthalten; sie richten sich nach dem Halte-/Parkverstoß des
 * Fahrzeugs (siehe `applyTimeModeWording`).
 */
export interface IncidentType {
	id: string;
	label: string;
	/** Bezeichnung in der E-Mail, wenn sie vom Formular-Label abweicht. */
	emailLabel?: string;
	// Eigenständiger Satz, damit mehrere gewählte Verstoßarten in buildEmailBody zu einem
	// zusammenhängenden Text kombiniert werden können.
	description: string;
}

/** Alle Werte, die in den E-Mail-Text einer einzelnen Fahrzeug-Anzeige einfließen. */
export interface EmailTemplateInput {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressPostcode: string;
	addressCity: string;
	phone?: string;
	date: string;
	time: string;
	endTime?: string;
	locationStreet: string;
	locationHouseNumber?: string;
	locationPostcode: string;
	locationCity: string;
	incidentTypes: Pick<IncidentType, 'label' | 'description'>[];
	licensePlate?: string;
	licensePlateCountry?: string;
	vehicleType?: string;
	make?: string;
	color?: string;
	notes?: string;
	/** Sätze zum Ausmaß der Behinderung, je Eintrag ein vollständiger Satz. */
	impairments?: string[];
	/** Nominalphrasen der gefährdeten Personengruppen für eine Aufzählung. */
	endangeredPersons?: string[];
	endangeredPersonsNote?: string;
	photoCount: number;
	vehicleIndex?: number;
	vehicleTotal?: number;
}

/** Stadtspezifische Konfiguration: auswählbare Verstoßarten und E-Mail-Vorlage. */
export interface City {
	id: string;
	label: string;
	incidentTypes: IncidentType[];
	buildEmailBody: (input: EmailTemplateInput) => { subject: string; body: string };
}

const KOELN_INCIDENT_TYPES: IncidentType[] = [
	{
		id: 'gehweg',
		label: 'Halten/Parken auf dem Gehweg',
		emailLabel: '{Vorgang} auf dem Gehweg',
		description: 'Das Fahrzeug {verb} auf dem Gehweg.'
	},
	{
		id: 'halteverbot',
		label: 'Halten/Parken im Halteverbot',
		emailLabel: '{Vorgang} im Halteverbot',
		description: 'Das Fahrzeug {verb} in einem durch Verkehrszeichen ausgewiesenen Halteverbot.'
	},
	{
		id: 'parkverbot',
		label: 'Parken im Parkverbot',
		description: 'Das Fahrzeug parkte in einem durch Verkehrszeichen ausgewiesenen Parkverbot.'
	},
	{
		id: 'zweite-reihe',
		label: 'Halten/Parken in zweiter Reihe',
		emailLabel: '{Vorgang} in zweiter Reihe',
		description: 'Das Fahrzeug {verb} in zweiter Reihe und behinderte den fließenden Verkehr.'
	},
	{
		id: 'schwerbehindert',
		label: 'Parken auf Schwerbehinderten-Parkplatz',
		description:
			'Das Fahrzeug parkte auf einem gekennzeichneten Schwerbehinderten-Parkplatz, ohne dass ein gültiger Schwerbehindertenausweis sichtbar war.'
	},
	{
		id: 'feuerwehrzufahrt',
		label: 'Halten/Parken auf der Feuerwehrzufahrt',
		emailLabel: '{Vorgang} auf der Feuerwehrzufahrt',
		description: 'Das Fahrzeug {verb} auf der Feuerwehrzufahrt und blockierte diese.'
	},
	{
		id: 'radweg',
		label: 'Halten/Parken auf dem Radweg',
		emailLabel: '{Vorgang} auf dem Radweg',
		description: 'Das Fahrzeug {verb} auf dem Radweg und behinderte den Radverkehr.'
	},
	{
		id: 'kreuzung',
		label: 'Parken im Kreuzungsbereich',
		description:
			'Das Fahrzeug parkte im Kreuzungsbereich und beeinträchtigte die Sicht bzw. den Verkehrsfluss.'
	}
];

/** Alle unterstützten Städte, nachschlagbar per `city.id`. */
// Bewusst ohne recipientEmail: diese Datei wird auch clientseitig importiert (das Formular
// braucht incidentTypes/label), $env/static/private ist dort verboten — der Empfänger lebt
// darum in cities.server.ts.
export const CITIES: Record<string, City> = {
	koeln: {
		id: 'koeln',
		label: 'Köln',
		incidentTypes: KOELN_INCIDENT_TYPES,
		buildEmailBody
	}
};
