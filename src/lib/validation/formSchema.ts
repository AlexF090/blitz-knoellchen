export interface ReportFormData {
	firstName: string;
	lastName: string;
	address: string;
	email: string;
	date: string;
	time: string;
	locationAddress: string;
	incidentTypeIds: string[];
	licensePlate?: string;
	notes?: string;
}

export type FormErrors = Partial<Record<keyof ReportFormData, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateReportForm(data: ReportFormData): FormErrors {
	const errors: FormErrors = {};

	if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
	if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';
	if (!data.address.trim()) errors.address = 'Adresse ist erforderlich.';
	if (!data.email.trim()) {
		errors.email = 'E-Mail-Adresse ist erforderlich.';
	} else if (!EMAIL_PATTERN.test(data.email.trim())) {
		errors.email = 'E-Mail-Adresse ist ungültig.';
	}
	if (!data.date.trim()) errors.date = 'Datum ist erforderlich.';
	if (!data.time.trim()) errors.time = 'Uhrzeit ist erforderlich.';
	if (!data.locationAddress.trim()) errors.locationAddress = 'Tatort-Adresse ist erforderlich.';
	if (data.incidentTypeIds.length === 0)
		errors.incidentTypeIds = 'Mindestens eine Verstoßart ist erforderlich.';

	return errors;
}

export function isFormValid(errors: FormErrors): boolean {
	return Object.keys(errors).length === 0;
}
