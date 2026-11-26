/**
 * Feste Origin der App. Canonical, Open Graph, strukturierte Daten und Sitemap bauen ihre
 * absoluten URLs ausschließlich hieraus — nie aus der Origin der Anfrage.
 */
export const SITE_ORIGIN = 'https://blitz-knoellchen.appool.de';

/** Impressum des Betreibers; gilt für appool.de und alle Subdomains. */
export const IMPRESSUM_URL = 'https://appool.de/impressum';

/** Betreiber und Verantwortlicher (Datenschutz). Identisch zu `siteOperator` im Projekt appool. */
export const SITE_OPERATOR = {
	name: 'Alexander Fischenich',
	street: 'Schwester-Firma-Weg 24',
	postalCode: '51143',
	city: 'Köln',
	country: 'Deutschland',
	generalEmail: 'kontakt@appool.de',
	supportEmail: 'blitz-knoellchen@appool.de'
} as const;
