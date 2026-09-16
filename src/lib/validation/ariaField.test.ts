import { describe, expect, it } from 'vitest';
import { ariaFieldProps } from './ariaField';

describe('ariaFieldProps', () => {
	it('markiert das Feld nicht als ungültig, wenn kein Fehler vorliegt', () => {
		expect(ariaFieldProps('email', undefined)).toEqual({
			'aria-invalid': false,
			'aria-describedby': undefined
		});
	});

	it('markiert das Feld als ungültig und verknüpft die Fehlermeldung, wenn ein Fehler vorliegt', () => {
		expect(ariaFieldProps('email', 'E-Mail-Adresse ist ungültig.')).toEqual({
			'aria-invalid': true,
			'aria-describedby': 'email-error'
		});
	});
});
