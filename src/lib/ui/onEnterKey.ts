/**
 * Keydown-Handler, der bei Enter `action` auslöst statt das umgebende `<form>` abzuschicken
 * (z.B. Profil speichern, Fahrzeug-Karte einklappen).
 */
export const onEnterKey = (action: () => void) => (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	action();
};
