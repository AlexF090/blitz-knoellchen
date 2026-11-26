import { describe, expect, it } from 'vitest';
import { buildSitemapXml, SITEMAP_PATHS } from './sitemap.ts';

describe('buildSitemapXml', () => {
	const xml = buildSitemapXml();

	it('ist ein urlset im Sitemap-Namensraum', () => {
		expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
	});

	it('listet jede öffentliche Seite mit fester Origin', () => {
		expect(SITEMAP_PATHS).toEqual(['/', '/faq', '/datenschutz']);
		expect(xml).toContain('<loc>https://blitz-knoellchen.appool.de/</loc>');
		expect(xml).toContain('<loc>https://blitz-knoellchen.appool.de/faq</loc>');
		expect(xml).toContain('<loc>https://blitz-knoellchen.appool.de/datenschutz</loc>');
	});

	it('enthält weder Historie noch API noch Impressum', () => {
		expect(xml).not.toContain('/historie');
		expect(xml).not.toContain('/api/');
		expect(xml).not.toContain('/impressum');
	});
});
