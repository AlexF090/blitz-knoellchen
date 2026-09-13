import { EMAIL_FROM } from '$env/static/private';
import { CITIES } from '$lib/config/cities';
import { getRecipientEmail } from '$lib/config/cities.server';
import type { PageServerLoad } from './$types';

// Bewusster, expliziter Server->Client-Datenfluss über eine load-Funktion (statt eines direkten
// $env/static/private-Imports in Client-Code, den SvelteKit ohnehin ablehnt) — die E-Mail-Vorschau
// in VehicleBlock.svelte zeigt den echten Empfänger an, damit Nutzer vor dem Absenden sehen, wohin
// die Anzeige tatsächlich geht. Der Erfolgsdialog nach dem Absenden zeigt aus demselben Grund
// den echten Absender (`EMAIL_FROM`, der in `api/send/+server.ts` als `sender.email` verschickt
// wird), damit Nutzer wissen, nach welcher Adresse sie in Postfach/Spam-Ordner suchen müssen.
export const load: PageServerLoad = () => {
	return {
		demoRecipientEmail: getRecipientEmail(CITIES.koeln.id, 'demo'),
		liveRecipientEmail: getRecipientEmail(CITIES.koeln.id, 'live'),
		senderEmail: EMAIL_FROM
	};
};
