import { SITE_ORIGIN } from '#lib/site.ts';

/**
 * Sperrt die Indexierung für jede Origin außer der Produktionsdomain (`SITE_ORIGIN`), etwa für
 * Preview-Deployments, `*.workers.dev` und den lokalen Betrieb. Nur die Produktionsdomain soll in
 * Suchmaschinen erscheinen.
 */
export const applyIndexingPolicy = (headers: Headers, requestOrigin: string): void => {
	if (requestOrigin === SITE_ORIGIN) return;
	headers.set('X-Robots-Tag', 'noindex');
};
