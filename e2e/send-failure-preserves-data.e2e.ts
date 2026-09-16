import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';
import { test, expect, BREVO_FAILURE_EMAIL } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Sende-Fehler: Formulardaten bleiben erhalten', async ({ page }) => {
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
	// Löst über den Brevo-Mock (s. fixtures.ts, e2e/mocks/brevo-mock-server.mjs) einen echten
	// HTTP-500 vom /api/send-Endpunkt aus — /api/send selbst läuft dabei real, nicht gemockt.
	await page.locator('#email').fill(BREVO_FAILURE_EMAIL);
	await page.locator('#phone').fill('0221 12345678');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('alert')).toContainText('Der Versand ist fehlgeschlagen');

	await expect(page.locator('#firstName')).toHaveValue('Max');
	await expect(page.locator('#lastName')).toHaveValue('Mustermann');
	await expect(page.locator('#addressStreet')).toHaveValue('Musterstraße 1');
	await expect(page.locator('#addressPostcode')).toHaveValue('50667');
	await expect(page.locator('#addressCity')).toHaveValue('Köln');
	await expect(page.locator('#email')).toHaveValue(BREVO_FAILURE_EMAIL);
	await expect(page.locator('#phone')).toHaveValue('0221 12345678');
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');
	await expect(page.locator('[id^="locationHouseNumber-"]')).toHaveValue('4');
	await expect(page.locator('[id^="locationPostcode-"]')).toHaveValue('50667');
	await expect(page.locator('[id^="locationCity-"]')).toHaveValue('Köln');
	await expect(page.getByLabel('Parken auf dem Gehweg')).toBeChecked();
	// Kennzeichen-Normalisierung passiert bereits bei Blur (gewollt), nicht erst beim Versand.
	await expect(page.getByLabel('Kennzeichen')).toHaveValue('K-AB1234');
	await expect(page.getByLabel('Fahrzeugart')).toHaveValue('PKW');
	await expect(page.getByLabel('Farbe')).toHaveValue('Rot');
});
