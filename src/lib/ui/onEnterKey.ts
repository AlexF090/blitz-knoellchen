const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio']);

/**
 * Keydown-Handler, der bei Enter in einem Eingabefeld `action` auslöst statt das umgebende
 * `<form>` abzuschicken (z.B. Profil speichern, Fahrzeug-Karte einklappen).
 */
export const onEnterKey = (action: () => void) => (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;
	// Schon behandelt, z.B. von der Adress-Autocomplete beim Übernehmen eines Vorschlags.
	if (event.defaultPrevented) return;
	// Nur Eingabefelder lösen das implizite Absenden aus. Eine Textarea braucht Enter für den
	// Zeilenumbruch, Buttons für ihre eigene Aktion.
	const { target } = event;
	if (!(target instanceof HTMLInputElement) || NON_TEXT_INPUT_TYPES.has(target.type)) return;

	event.preventDefault();
	action();
};
