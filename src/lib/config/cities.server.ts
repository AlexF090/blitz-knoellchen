import { RECIPIENT_EMAIL } from '$env/static/private';

// Getrennt von cities.ts, weil $env/static/private niemals von clientseitigem
// Code importiert werden darf (SvelteKit lehnt das beim Build ab). Ein zweiter
// Städte-Eintrag würde hier eine weitere env-gestützte Zeile bekommen.
const RECIPIENT_EMAILS: Record<string, string> = {
	koeln: RECIPIENT_EMAIL
};

export const getRecipientEmail = (cityId: string): string => {
	const email = RECIPIENT_EMAILS[cityId];
	if (!email) throw new Error(`Keine Empfänger-E-Mail für Stadt "${cityId}" konfiguriert.`);
	return email;
};
