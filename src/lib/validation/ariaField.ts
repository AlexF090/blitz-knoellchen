/** Die ARIA-Attribute, die ein Eingabefeld mit seiner Fehlermeldung verknüpfen. */
export interface AriaFieldProps {
	'aria-invalid': boolean;
	'aria-describedby': string | undefined;
}

/**
 * Verknüpft ein Formularfeld mit seiner Fehlermeldung für Screenreader. Die Fehlermeldung
 * braucht dazu passend `id="{fieldId}-error"` und `role="alert"`.
 */
export const ariaFieldProps = (fieldId: string, error: string | undefined): AriaFieldProps => ({
	'aria-invalid': !!error,
	'aria-describedby': error ? `${fieldId}-error` : undefined
});
