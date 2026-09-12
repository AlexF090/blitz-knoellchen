import { buildEmailBody } from '$lib/email/buildEmailBody';

export interface IncidentType {
	id: string;
	label: string;
	// Eigenständiger Satz für die E-Mail, damit mehrere gewählte Verstoßarten zu einem
	// zusammenhängenden Text kombiniert werden können (siehe buildEmailBody).
	description: string;
}

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
	photoCount: number;
	vehicleIndex?: number;
	vehicleTotal?: number;
}

export interface City {
	id: string;
	label: string;
	incidentTypes: IncidentType[];
	buildEmailBody: (input: EmailTemplateInput) => { subject: string; body: string };
}

const KOELN_INCIDENT_TYPES: IncidentType[] = [
	{
		id: 'gehweg',
		label: 'Parken auf dem Gehweg',
		description: 'Das Fahrzeug parkte auf dem Gehweg und behinderte Fußgänger.'
	},
	{
		id: 'zweite-reihe',
		label: 'Parken in zweiter Reihe',
		description: 'Das Fahrzeug parkte in zweiter Reihe und behinderte den fließenden Verkehr.'
	},
	{
		id: 'schwerbehindert',
		label: 'Parken auf Schwerbehinderten-Parkplatz',
		description:
			'Das Fahrzeug parkte auf einem gekennzeichneten Schwerbehinderten-Parkplatz, ohne dass ein gültiger Schwerbehindertenausweis sichtbar war.'
	},
	{
		id: 'halteverbot',
		label: 'Parken im Halteverbot',
		description: 'Das Fahrzeug parkte in einem durch Verkehrszeichen ausgewiesenen Halteverbot.'
	},
	{
		id: 'feuerwehrzufahrt',
		label: 'Parken auf der Feuerwehrzufahrt',
		description: 'Das Fahrzeug parkte auf der Feuerwehrzufahrt und blockierte diese.'
	},
	{
		id: 'radweg',
		label: 'Parken auf dem Radweg',
		description: 'Das Fahrzeug parkte auf dem Radweg und behinderte den Radverkehr.'
	},
	{
		id: 'kreuzung',
		label: 'Parken im Kreuzungsbereich',
		description:
			'Das Fahrzeug parkte im Kreuzungsbereich und beeinträchtigte die Sicht bzw. den Verkehrsfluss.'
	}
];

// Bewusst ohne recipientEmail: diese Datei wird auch clientseitig importiert
// (Formular braucht incidentTypes/label), $env/static/private ist dort verboten.
// Der Empfänger lebt darum in cities.server.ts, per city-id nachschlagbar.
export const CITIES: Record<string, City> = {
	koeln: {
		id: 'koeln',
		label: 'Köln',
		incidentTypes: KOELN_INCIDENT_TYPES,
		buildEmailBody
	}
};
