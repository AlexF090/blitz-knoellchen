import { defineEnvVars } from '@sveltejs/kit/env';

/** Leerer oder fehlender Wert gilt als „nicht gesetzt“; sonst muss es eine absolute URL sein. */
export const parseOptionalUrl = (value: string | undefined): string | undefined => {
	if (!value) return undefined;
	if (!URL.canParse(value)) throw new Error(`„${value}“ ist keine gültige URL.`);
	return value;
};

/** Leerer oder fehlender Wert gilt als „nicht gesetzt“; sonst eine ganze Zahl größer 0. */
export const parseOptionalPositiveInteger = (value: string | undefined): number | undefined => {
	if (!value) return undefined;
	const number = Number(value);
	if (!Number.isInteger(number) || number <= 0) {
		throw new Error(`„${value}“ ist keine ganze Zahl größer 0.`);
	}
	return number;
};

/**
 * Alle Umgebungsvariablen der App; serverseitig über `$app/env/private` lesbar. Alle Werte werden
 * zur Laufzeit gelesen, auf Cloudflare aus den Variablen und Secrets des Workers.
 */
// Ohne `schema` muss eine Variable gesetzt sein, darf aber leer sein (s. .env.example).
export const variables = defineEnvVars({
	// Kein `static: true`: Eingebackene Werte stünden im Worker-Bundle und in jedem lokalen Build.
	BREVO_API_KEY: { description: 'API-Schlüssel für den E-Mail-Versand über Brevo.' },
	EMAIL_FROM: { description: 'Absenderadresse; muss in Brevo domain-authentifiziert sein.' },
	RECIPIENT_EMAIL_DEMO: { description: 'Empfänger im Demo-Modus.' },
	RECIPIENT_EMAIL_LIVE: { description: 'Empfänger im Live-Modus (Bußgeldstelle).' },
	LOCATIONIQ_API_KEY: { description: 'API-Schlüssel für das Geocoding.' },
	BREVO_API_URL: {
		schema: parseOptionalUrl,
		description: 'Nur für E2E-Tests: Brevo-Endpunkt eines lokalen Mocks.'
	},
	SEND_LIMIT_PER_MINUTE: {
		schema: parseOptionalPositiveInteger,
		description:
			'Nur für E2E-Tests: Sendelimit pro Minute und IP im Speicher statt über das Cloudflare-Binding.'
	}
});
