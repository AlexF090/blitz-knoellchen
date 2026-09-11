import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
	await page.route('**/api/send', (route) => route.fulfill({ status: 500, json: {} }));

	await page.goto('/');

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');
	await page.locator('#phone').fill('0221 12345678');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('alert')).toContainText('Der Versand ist fehlgeschlagen');

	await expect(page.locator('#firstName')).toHaveValue('Max');
	await expect(page.locator('#lastName')).toHaveValue('Mustermann');
	await expect(page.locator('#addressStreet')).toHaveValue('Musterstraße 1');
	await expect(page.locator('#addressPostcode')).toHaveValue('50667');
	await expect(page.locator('#addressCity')).toHaveValue('Köln');
	await expect(page.locator('#email')).toHaveValue('max@example.com');
	await expect(page.locator('#phone')).toHaveValue('0221 12345678');
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');
	await expect(page.locator('[id^="locationHouseNumber-"]')).toHaveValue('4');
	await expect(page.locator('[id^="locationPostcode-"]')).toHaveValue('50667');
	await expect(page.locator('[id^="locationCity-"]')).toHaveValue('Köln');
	await expect(page.getByLabel('Parken auf dem Gehweg')).toBeChecked();
	await expect(page.getByLabel('Kennzeichen')).toHaveValue('K-AB 1234');
	await expect(page.getByLabel('Farbe')).toHaveValue('Rot');
});
