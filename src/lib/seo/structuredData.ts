import { SITE_ORIGIN } from '#lib/site.ts';

/**
 * Serialisiert einen Wert für ein `<script type="application/ld+json">`. `<` wird als `\u003c`
 * maskiert, damit der Inhalt das Skript-Element nicht per `</script>` verlassen kann; JSON.parse
 * liefert den Originalwert trotzdem zurück.
 */
export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/**
 * JSON-LD der App als schema.org-`WebApplication`, serialisiert über
 * `serializeJsonLd`.
 */
export function buildStructuredDataJson(): string {
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Blitz-Knöllchen',
		url: `${SITE_ORIGIN}/`,
		description: 'Falschparker in rund 30 Sekunden an die Bußgeldstelle Köln melden.',
		applicationCategory: 'UtilitiesApplication',
		operatingSystem: 'Alle',
		inLanguage: 'de',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
	};
	return serializeJsonLd(structuredData);
}

/** Fertiges `<script type="application/ld+json">`-Element zum Einbetten per `{@html}`. */
export function buildStructuredDataElement(): string {
	return `<script type="application/ld+json">${buildStructuredDataJson()}</script>`;
}
