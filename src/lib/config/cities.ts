import { buildEmailBody } from '$lib/email/buildEmailBody';

export interface IncidentType {
	id: string;
	label: string;
}

export interface EmailTemplateInput {
	firstName: string;
	lastName: string;
	address: string;
	date: string;
	time: string;
	locationAddress: string;
	incidentTypeLabel: string;
	licensePlate?: string;
	notes?: string;
}

export interface City {
	id: string;
	label: string;
	incidentTypes: IncidentType[];
	buildEmailBody: (input: EmailTemplateInput) => { subject: string; body: string };
}

const KOELN_INCIDENT_TYPES: IncidentType[] = [
	{ id: 'gehweg', label: 'Parken auf dem Gehweg' },
	{ id: 'zweite-reihe', label: 'Parken in zweiter Reihe' },
	{ id: 'schwerbehindert', label: 'Parken auf Schwerbehinderten-Parkplatz' },
	{ id: 'halteverbot', label: 'Parken im Halteverbot' },
	{ id: 'feuerwehrzufahrt', label: 'Parken auf der Feuerwehrzufahrt' },
	{ id: 'radweg', label: 'Parken auf dem Radweg' },
	{ id: 'kreuzung', label: 'Parken im Kreuzungsbereich' }
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
