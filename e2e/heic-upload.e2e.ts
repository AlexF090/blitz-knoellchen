import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';
import { test, expect } from './fixtures';

declare global {
	interface Window {
		reportCspViolation: (directive: string, blockedUri: string) => void;
	}
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Aus photo-with-gps.jpg per `sips -s format heic` erzeugt, gleiche (synthetische) GPS-Daten.
const HEIC_FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.heic');

test.beforeEach(async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);
});

test('liefert die Seite mit Content-Security-Policy aus', async ({ page }) => {
	const response = await page.goto('/');

	const policy = response?.headers()['content-security-policy'] ?? '';
	expect(policy).toContain("default-src 'self'");
	expect(policy).toContain("worker-src 'self' blob:");
});

// Sichert gegen den Production-Build ab, dass die CSP den Konvertierungs-Worker von heic-to/csp
// nicht blockiert: Der Worker startet über eine blob:-URL, die nur mit `worker-src blob:` läuft.
test('konvertiert ein HEIC-Foto ohne CSP-Verstoß', async ({ page }) => {
	const violations: string[] = [];
	await page.exposeFunction('reportCspViolation', (directive: string, blockedUri: string) => {
		violations.push(`${directive}: ${blockedUri}`);
	});
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			window.reportCspViolation(event.violatedDirective, event.blockedURI);
		});
	});

	await page.goto('/');
	await chooseAppMode(page);
	await page.locator('#photo-pool-input').setInputFiles(HEIC_FIXTURE);

	await expect(page.getByRole('button', { name: /vergrößern/ })).toBeVisible();
	expect(violations).toEqual([]);
});
