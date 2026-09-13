import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Happy Path: Foto -> Auto-Fill -> Absenden -> Historie', async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));

	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');
	await expect(page.locator('[id^="locationHouseNumber-"]')).toHaveValue('4');
	await expect(page.locator('[id^="locationPostcode-"]')).toHaveValue('50667');
	await expect(page.locator('[id^="locationCity-"]')).toHaveValue('Köln');
	await expect(page.locator('[id^="date-"]')).toHaveValue('2026-03-01');

	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Parken im Halteverbot').check();
	await page.getByLabel('Kennzeichen').fill('K AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('dialog')).toContainText('Anzeige erfolgreich versendet');

	await page.getByRole('dialog').getByRole('link', { name: 'Zur Historie' }).click();
	await expect(page.getByText('Parken auf dem Gehweg, Parken im Halteverbot')).toBeVisible();
	await expect(page.getByText('Domkloster 4, 50667 Köln')).toBeVisible();
	// Kennzeichen-Normalisierung: "K AB 1234" (getippt) -> "K-AB1234" (kanonisches Köln-Format).
	await expect(page.getByText('K-AB1234 · Unbekannt · Rot')).toBeVisible();
});
