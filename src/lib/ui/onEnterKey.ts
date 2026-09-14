// Für Felder innerhalb eines <form>, dessen Enter-Taste nicht das gesamte Formular abschicken
// soll, sondern eine lokale Aktion auslöst (z.B. Profil speichern, Fahrzeug-Karte einklappen).
export const onEnterKey = (action: () => void) => (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	action();
};
