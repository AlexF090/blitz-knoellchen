import { test, expect } from './fixtures';

interface ManifestIcon {
	src: string;
}

test('liefert jedes Icon aus Manifest und <head> als Bild aus', async ({ page, request }) => {
	await page.goto('/');

	const headIconPaths = await page
		.locator('link[rel="icon"], link[rel="apple-touch-icon"]')
		.evaluateAll((links) =>
			links.map((link) => new URL(link.getAttribute('href') ?? '', document.baseURI).pathname)
		);

	const manifestResponse = await request.get('/manifest.webmanifest');
	expect(manifestResponse.ok()).toBe(true);
	const manifest: { icons: ManifestIcon[] } = await manifestResponse.json();
	const manifestIconPaths = manifest.icons.map((icon) => new URL(icon.src, page.url()).pathname);

	expect(headIconPaths).toContain('/apple-touch-icon-180x180.png');
	// 192 und 512 verlangen Browser für die Installierbarkeit.
	expect(manifestIconPaths).toContain('/pwa-192x192.png');
	expect(manifestIconPaths).toContain('/pwa-512x512.png');

	for (const path of new Set([...headIconPaths, ...manifestIconPaths])) {
		const response = await request.get(path);
		expect(response.status(), path).toBe(200);
		expect(response.headers()['content-type'], path).toMatch(/^image\//);
	}
});
