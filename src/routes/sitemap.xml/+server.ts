import { buildSitemapXml } from '#lib/seo/sitemap.ts';

export const prerender = true;

export function GET(): Response {
	return new Response(buildSitemapXml(), {
		headers: { 'Content-Type': 'application/xml' }
	});
}
