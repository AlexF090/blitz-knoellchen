import { SITE_ORIGIN } from '#lib/site.ts';

export interface PageMetadata {
	canonicalUrl: string;
	openGraphUrl: string;
	openGraphImageUrl: string;
}

/**
 * Absolute URLs für canonical, `og:url` und `og:image` einer Seite. Sie entstehen aus der festen
 * Origin und dem Pfad, nie aus der Origin der Anfrage — so zeigen auch Aufrufe über
 * Preview-Deployments oder alte Hostnamen auf die Produktionsdomain.
 */
export function buildPageMetadata(pathname: string): PageMetadata {
	const pageUrl = `${SITE_ORIGIN}${pathname}`;
	return {
		canonicalUrl: pageUrl,
		openGraphUrl: pageUrl,
		openGraphImageUrl: `${SITE_ORIGIN}/og-image.png`
	};
}
