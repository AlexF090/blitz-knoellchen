import { test, expect } from './fixtures';

const SITE_ORIGIN = 'https://blitz-knoellchen.appool.de';

test('Footer verlinkt das zentrale Impressum auf appool.de', async ({ page }) => {
	await page.goto('/');

	const link = page.getByRole('link', { name: 'Impressum' });
	await expect(link).toHaveAttribute('href', 'https://appool.de/impressum');
	await expect(link).toHaveAttribute('target', '_blank');
});

test('setzt canonical und og:url auf die feste Origin statt auf den Testserver', async ({
	page
}) => {
	await page.goto('/faq');

	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_ORIGIN}/faq`);
	const openGraphUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
	expect(openGraphUrl?.startsWith(SITE_ORIGIN)).toBe(true);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		'content',
		`${SITE_ORIGIN}/og-image.png`
	);
});

test('bettet JSON-LD ein, ohne dass die CSP etwas blockiert', async ({ page }) => {
	const cspViolations: string[] = [];
	page.on('console', (message) => {
		if (message.text().includes('Content Security Policy')) cspViolations.push(message.text());
	});

	await page.goto('/');

	const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
	expect(JSON.parse(jsonLd ?? '{}')['@type']).toBe('WebApplication');
	expect(cspViolations).toEqual([]);
});

test('leitet /impressum dauerhaft auf appool.de weiter', async ({ request }) => {
	const response = await request.get('/impressum', { maxRedirects: 0 });

	expect(response.status()).toBe(301);
	expect(response.headers()['location']).toBe('https://appool.de/impressum');
});

test('liefert die Sitemap aus und verweist in robots.txt darauf', async ({ request }) => {
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(await sitemap.text()).toContain(`<loc>${SITE_ORIGIN}/datenschutz</loc>`);

	const robots = await request.get('/robots.txt');
	expect(await robots.text()).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
});
