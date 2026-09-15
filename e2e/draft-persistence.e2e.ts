import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';
import { test, expect } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test.use({ serviceWorkers: 'block' });

test('Fahrzeugdaten überleben einen Reload als Entwurf', async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await expect(page.locator('[id^="date-"]')).toHaveValue('2026-03-01');

	await page.locator('[id^="locationStreet-"]').fill('Domkloster');
	await page.locator('[id^="locationPostcode-"]').fill('50667');
	await page.locator('[id^="locationCity-"]').fill('Köln');
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');

	// Autosave ist debounced (800ms) — kurz warten, bevor neu geladen wird.
	await page.waitForTimeout(1200);

	// sessionStorage überlebt den Reload (s. ADR "Demo/Live-Modus-Auswahl" in docs/architektur.md) — der
	// Dialog erscheint hier bewusst nicht erneut, ein zweiter chooseAppMode()-Aufruf würde ewig
	// auf einen nie erscheinenden Dialog warten.
	await page.reload();

	// Kein Flash: "Deine Angaben" soll sofort im gelesenen Zustand stehen, nie leer im
	// Bearbeiten-Modus aufblitzen.
	await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
	await expect(page.getByText('Max Mustermann')).toBeVisible();

	await expect(page.getByLabel('Kennzeichen')).toHaveValue('K-AB 1234');
	await expect(page.getByLabel('Fahrzeugart')).toHaveValue('PKW');
	await expect(page.getByLabel('Parken auf dem Gehweg')).toBeChecked();
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');
});
