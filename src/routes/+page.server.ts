import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import type { PageServerLoad } from './$types';

// Bewusster, expliziter Server->Client-Datenfluss über eine load-Funktion (statt eines direkten
// $env/static/private-Imports in Client-Code, den SvelteKit ohnehin ablehnt) — die E-Mail-Vorschau
// in VehicleBlock.svelte zeigt den echten Empfänger an, damit Nutzer vor dem Absenden sehen, wohin
// die Anzeige tatsächlich geht.
export const load: PageServerLoad = () => {
	return { recipientEmail: getRecipientEmail(CITIES.koeln.id) };
};
