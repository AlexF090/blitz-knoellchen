import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Geocoding-Fehler: manuelles Adressfeld wird Pflicht', async ({ page }) => {
	await page.route('**/api/geocode**', (route) => route.fulfill({ status: 500, json: {} }));

	await page.goto('/');
	await page.locator('#photo').setInputFiles(FIXTURE);

	await expect(
		page.getByText('Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.')
	).toBeVisible();
	await expect(page.locator('#locationAddress')).toHaveAttribute('required', '');
	await expect(page.locator('#locationAddress')).toHaveValue('');
});
