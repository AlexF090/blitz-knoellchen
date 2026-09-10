import { describe, expect, it } from 'vitest';
import { isFormValid, validateReportForm, type ReportFormData } from './formSchema';

const validData: ReportFormData = {
	firstName: 'Max',
	lastName: 'Mustermann',
	address: 'Musterstraße 1, 50667 Köln',
	email: 'max@example.com',
	date: '2026-03-01',
	time: '14:30',
	locationAddress: 'Domkloster 4, 50667 Köln',
	incidentTypeId: 'gehweg',
	licensePlate: 'K-AB 1234',
	notes: ''
};

describe('validateReportForm', () => {
	it('akzeptiert gültige Eingaben', () => {
		const errors = validateReportForm(validData);
		expect(isFormValid(errors)).toBe(true);
	});

	it('meldet fehlende Pflichtfelder', () => {
		const errors = validateReportForm({
			...validData,
			locationAddress: '',
			incidentTypeId: ''
		});
		expect(errors.locationAddress).toBeDefined();
		expect(errors.incidentTypeId).toBeDefined();
		expect(isFormValid(errors)).toBe(false);
	});

	it('meldet ungültige E-Mail-Adresse', () => {
		const errors = validateReportForm({ ...validData, email: 'keine-email' });
		expect(errors.email).toBeDefined();
	});
});
