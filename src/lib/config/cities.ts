import { buildEmailBody } from '$lib/email/buildEmailBody';

/**
 * Eine auswählbare Verstoßart mit Formular-Label und E-Mail-Satz.
 *
 * `emailLabel` und `description` dürfen die Platzhalter `{verb}` („hielt"/„parkte") und
 * `{noun}` („Halten"/„Parken") enthalten; sie richten sich nach dem Halte-/Parkverstoß des
 * Fahrzeugs (siehe `applyTimeModeWording`). `label` erscheint unverändert im Formular und trägt
 * keine Platzhalter.
 */
export interface IncidentType {
	id: string;
	label: string;
	/** Bezeichnung in der E-Mail, wenn sie vom Formular-Label abweicht. */
	emailLabel?: string;
	// Eigenständiger Satz, damit mehrere gewählte Verstoßarten in buildEmailBody zu einem
	// zusammenhängenden Text kombiniert werden können.
	description: string;
	/** Nur das Parken ist verboten, das Halten erlaubt: anzeigbar nur als Parkverstoß. */
	parkingOnly?: boolean;
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
		emailLabel: '{noun} auf dem Gehweg',
		description: 'Das Fahrzeug {verb} auf dem Gehweg.'
	},
	{
		id: 'halteverbot',
		label: 'Halten/Parken im Halteverbot',
		emailLabel: '{noun} im Halteverbot',
		description: 'Das Fahrzeug {verb} in einem durch Verkehrszeichen ausgewiesenen Halteverbot.'
	},
	{
		id: 'parkverbot',
		label: 'Parken im Parkverbot',
		parkingOnly: true,
		description: 'Das Fahrzeug parkte in einem durch Verkehrszeichen ausgewiesenen Parkverbot.'
	},
	{
		id: 'zweite-reihe',
		label: 'Halten/Parken in zweiter Reihe',
		emailLabel: '{noun} in zweiter Reihe',
		description: 'Das Fahrzeug {verb} in zweiter Reihe und behinderte den fließenden Verkehr.'
	},
	{
		id: 'schwerbehindert',
		label: 'Parken auf Schwerbehinderten-Parkplatz',
		parkingOnly: true,
		description:
			'Das Fahrzeug parkte auf einem gekennzeichneten Schwerbehinderten-Parkplatz, ohne dass ein gültiger Schwerbehindertenausweis sichtbar war.'
	},
	{
		id: 'feuerwehrzufahrt',
		label: 'Halten/Parken auf der Feuerwehrzufahrt',
		emailLabel: '{noun} auf der Feuerwehrzufahrt',
		description: 'Das Fahrzeug {verb} auf der Feuerwehrzufahrt und blockierte diese.'
	},
	{
		id: 'radweg',
		label: 'Halten/Parken auf dem Radweg',
		emailLabel: '{noun} auf dem Radweg',
		description: 'Das Fahrzeug {verb} auf dem Radweg und behinderte den Radverkehr.'
	},
	{
		id: 'entgegen-fahrtrichtung',
		label: 'Halten/Parken entgegen der Fahrtrichtung',
		emailLabel: '{noun} entgegen der Fahrtrichtung',
		description: 'Das Fahrzeug {verb} entgegen der Fahrtrichtung am linken Fahrbahnrand.'
	},
	{
		id: 'fussgaengerueberweg',
		label: 'Halten/Parken auf oder vor einem Fußgängerüberweg (Mindestabstand 5 m)',
		emailLabel: '{noun} auf oder vor einem Fußgängerüberweg',
		description: 'Das Fahrzeug {verb} auf einem Fußgängerüberweg oder weniger als 5 m davor.'
	},
	{
		id: 'kreuzung',
		label: 'Parken im Kreuzungsbereich',
		parkingOnly: true,
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

/**
 * Liefert die gewählten Verstoßarten, bei denen nur das Parken verboten ist. Sucht über alle
 * Städte, weil die Validierung die Stadt der Anzeige nicht kennt; eine id gilt stadtübergreifend
 * als dieselbe Verstoßart.
 */
export const findParkingOnlyIncidentTypes = (incidentTypeIds: string[]): IncidentType[] => {
	const parkingOnlyTypes = new Map<string, IncidentType>();
	for (const city of Object.values(CITIES)) {
		for (const type of city.incidentTypes) {
			if (type.parkingOnly && incidentTypeIds.includes(type.id)) {
				parkingOnlyTypes.set(type.id, type);
			}
		}
	}
	return [...parkingOnlyTypes.values()];
};
