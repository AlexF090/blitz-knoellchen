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
	await page.locator('#address').fill('Musterstraße 1, 50667 Köln');
	await page.locator('#email').fill('max@example.com');
	await page.locator('#photo').setInputFiles(FIXTURE);
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.locator('#licensePlate').fill('K-AB 1234');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('alert')).toContainText('Der Versand ist fehlgeschlagen');

	await expect(page.locator('#firstName')).toHaveValue('Max');
	await expect(page.locator('#lastName')).toHaveValue('Mustermann');
	await expect(page.locator('#address')).toHaveValue('Musterstraße 1, 50667 Köln');
	await expect(page.locator('#email')).toHaveValue('max@example.com');
	await expect(page.locator('#locationStreet')).toHaveValue('Domkloster');
	await expect(page.locator('#locationHouseNumber')).toHaveValue('4');
	await expect(page.locator('#locationPostcode')).toHaveValue('50667');
	await expect(page.locator('#locationCity')).toHaveValue('Köln');
	await expect(page.getByLabel('Parken auf dem Gehweg')).toBeChecked();
	await expect(page.locator('#licensePlate')).toHaveValue('K-AB 1234');
});
