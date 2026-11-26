/**
 * Sperrt die Indexierung, solange es nicht die Produktionsumgebung ist (Vercel-Preview-Deployments,
 * lokaler Betrieb, fehlende Angabe). Nur die Produktionsdomain soll in Suchmaschinen erscheinen.
 */
export const applyIndexingPolicy = (
	headers: Headers,
	vercelEnvironment: string | undefined
): void => {
	if (vercelEnvironment === 'production') return;
	headers.set('X-Robots-Tag', 'noindex');
};
