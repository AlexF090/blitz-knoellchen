import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Sende-Fehler: Formulardaten bleiben erhalten', async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({ json: { address: 'Domkloster 4, 50667 Köln' } })
	);
	await page.route('**/api/send', (route) => route.fulfill({ status: 500, json: {} }));

	await page.goto('/');

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#address').fill('Musterstraße 1, 50667 Köln');
	await page.locator('#email').fill('max@example.com');
	await page.locator('#photo').setInputFiles(FIXTURE);
	await page.locator('#incidentTypeId').selectOption('gehweg');
	await page.locator('#licensePlate').fill('K-AB 1234');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('alert')).toContainText('Der Versand ist fehlgeschlagen');

	await expect(page.locator('#firstName')).toHaveValue('Max');
	await expect(page.locator('#lastName')).toHaveValue('Mustermann');
	await expect(page.locator('#address')).toHaveValue('Musterstraße 1, 50667 Köln');
	await expect(page.locator('#email')).toHaveValue('max@example.com');
	await expect(page.locator('#locationAddress')).toHaveValue('Domkloster 4, 50667 Köln');
	await expect(page.locator('#incidentTypeId')).toHaveValue('gehweg');
	await expect(page.locator('#licensePlate')).toHaveValue('K-AB 1234');
});
