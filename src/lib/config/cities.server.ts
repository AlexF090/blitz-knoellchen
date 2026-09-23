import { RECIPIENT_EMAIL_DEMO, RECIPIENT_EMAIL_LIVE } from '$env/static/private';
import type { AppMode } from '$lib/appMode.svelte';

export type { AppMode };

// Getrennt von cities.ts, weil $env/static/private niemals von clientseitigem Code importiert
// werden darf (SvelteKit lehnt das beim Build ab). Ein zweiter Städte-Eintrag würde hier zwei
// weitere env-gestützte Zeilen bekommen.
const DEMO_RECIPIENT_EMAILS: Record<string, string> = {
	koeln: RECIPIENT_EMAIL_DEMO
};
const LIVE_RECIPIENT_EMAILS: Record<string, string> = {
	koeln: RECIPIENT_EMAIL_LIVE
};

/**
 * Liefert die Empfänger-Adresse der Bußgeldstelle für eine Stadt im jeweiligen Modus.
 * Wirft, wenn für die Kombination keine Adresse konfiguriert ist.
 */
export const getRecipientEmail = (cityId: string, mode: AppMode): string => {
	const table = mode === 'live' ? LIVE_RECIPIENT_EMAILS : DEMO_RECIPIENT_EMAILS;
	const email = table[cityId];
	if (!email) throw new Error(`Keine ${mode}-Empfänger-E-Mail für Stadt "${cityId}" konfiguriert.`);
	return email;
};
