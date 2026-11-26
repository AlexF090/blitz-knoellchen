import { describe, expect, it } from 'vitest';
import {
	buildStructuredDataElement,
	buildStructuredDataJson,
	serializeJsonLd
} from './structuredData.ts';

describe('buildStructuredDataJson', () => {
	const parsed = JSON.parse(buildStructuredDataJson());

	it('beschreibt die App als WebApplication', () => {
		expect(parsed['@context']).toBe('https://schema.org');
		expect(parsed['@type']).toBe('WebApplication');
		expect(parsed.name).toBe('Blitz-Knöllchen');
		expect(parsed.url).toBe('https://blitz-knoellchen.appool.de/');
		expect(parsed.inLanguage).toBe('de');
		expect(parsed.applicationCategory).toBe('UtilitiesApplication');
		expect(parsed.operatingSystem).toBe('Alle');
	});

	it('weist die App als kostenlos aus', () => {
		expect(parsed.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'EUR' });
	});

	it('maskiert "<", damit der Inhalt das Skript-Element nicht verlassen kann', () => {
		expect(buildStructuredDataJson()).not.toContain('<');
	});
});

describe('buildStructuredDataElement', () => {
	it('umschließt das JSON mit einem ld+json-Skript-Element', () => {
		const element = buildStructuredDataElement();

		expect(element.startsWith('<script type="application/ld+json">{')).toBe(true);
		expect(element.endsWith('}</script>')).toBe(true);
	});
});

describe('serializeJsonLd', () => {
	it('maskiert "<" und liefert per JSON.parse den Originalwert zurück', () => {
		const value = { name: '</script><script>alert(1)</script>', nested: ['<b>'] };

		const serialized = serializeJsonLd(value);

		expect(serialized).not.toContain('<');
		expect(JSON.parse(serialized)).toEqual(value);
	});
});
