import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

// Global sind Service Worker für die E2E-Tests blockiert (playwright.config.ts); hier geht es
// gerade um ihn.
test.use({ serviceWorkers: 'allow' });

// `navigator.serviceWorker.ready` erfüllt sich schon im Zustand „activating“; der Precache ist
// erst mit „activated“ vollständig. Abgefragt per expect.poll, weil waitForFunction das Promise
// einer async-Funktion nicht abwartet, sondern als erfüllt wertet.
const waitForActivatedServiceWorker = (page: Page) =>
	expect
		.poll(() =>
			page.evaluate(
				async () => (await navigator.serviceWorker.getRegistration())?.active?.state ?? null
			)
		)
		.toBe('activated');

test('registriert den Service Worker und lädt Seiten unter seiner Kontrolle weiter vom Server', async ({
	page
}) => {
	await page.goto('/');
	await waitForActivatedServiceWorker(page);
	// Die erste Seite übernimmt der Service Worker erst nach der Aktivierung (clientsClaim).
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	// Unter seiner Kontrolle müssen serverseitig gerenderte Seiten weiter vom Server kommen.
	await page.goto('/historie');
	expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
	await expect(page.getByRole('heading', { level: 1, name: 'Historie' })).toBeVisible();
});

test('legt nur Assets mit echten URLs in den Precache', async ({ page }) => {
	await page.goto('/');
	await waitForActivatedServiceWorker(page);

	const precachedPaths = await page.evaluate(async () => {
		const paths: string[] = [];
		for (const cacheName of await caches.keys()) {
			const cache = await caches.open(cacheName);
			for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
		}
		return paths;
	});

	expect(precachedPaths.length).toBeGreaterThan(0);
	expect(precachedPaths.some((path) => path.startsWith('/_app/immutable/'))).toBe(true);
	expect(precachedPaths.filter((path) => path.startsWith('/client/'))).toEqual([]);
	expect(precachedPaths.filter((path) => path.startsWith('/api/'))).toEqual([]);
});
