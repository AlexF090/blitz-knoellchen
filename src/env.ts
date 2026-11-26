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

/** Leerer oder fehlender Wert gilt als „nicht gesetzt“; sonst der Wert unverändert. */
export const parseOptionalString = (value: string | undefined): string | undefined =>
	value || undefined;

/**
 * Alle Umgebungsvariablen der App; serverseitig über `$app/env/private` lesbar. Werte mit
 * `static: true` werden zur Build-Zeit eingebacken, die übrigen beim Start gelesen.
 */
// Ohne `schema` muss eine Variable gesetzt sein, darf aber leer sein (s. .env.example).
export const variables = defineEnvVars({
	BREVO_API_KEY: { static: true, description: 'API-Schlüssel für den E-Mail-Versand über Brevo.' },
	EMAIL_FROM: {
		static: true,
		description: 'Absenderadresse; muss in Brevo domain-authentifiziert sein.'
	},
	RECIPIENT_EMAIL_DEMO: { static: true, description: 'Empfänger im Demo-Modus.' },
	RECIPIENT_EMAIL_LIVE: { static: true, description: 'Empfänger im Live-Modus (Bußgeldstelle).' },
	LOCATIONIQ_API_KEY: { static: true, description: 'API-Schlüssel für das Geocoding.' },
	BREVO_API_URL: {
		schema: parseOptionalUrl,
		description: 'Nur für E2E-Tests: Brevo-Endpunkt eines lokalen Mocks.'
	},
	VERCEL_ENV: {
		schema: parseOptionalString,
		description:
			'Von Vercel gesetzt (production, preview, development); steuert, ob die Seiten indexierbar sind.'
	},
	SEND_LIMIT_PER_HOUR: {
		schema: parseOptionalPositiveInteger,
		description: 'Nur für E2E-Tests: Sendelimit pro Stunde und IP (Standard 20).'
	}
});
