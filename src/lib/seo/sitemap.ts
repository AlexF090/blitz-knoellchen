import { SITE_ORIGIN } from '#lib/site.ts';

/** Öffentliche, indexierbare Seiten. Die Historie liegt lokal im Browser und gehört nicht dazu. */
export const SITEMAP_PATHS = ['/', '/faq', '/datenschutz'];

/** Sitemap im sitemaps.org-Format mit absoluten URLs auf der festen Origin. */
export function buildSitemapXml(): string {
	const entries = SITEMAP_PATHS.map(
		(pathname) => `\t<url>\n\t\t<loc>${SITE_ORIGIN}${pathname}</loc>\n\t</url>`
	).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
