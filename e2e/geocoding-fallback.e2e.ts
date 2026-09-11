import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Geocoding-Fehler: manuelles Adressfeld wird Pflicht', async ({ page }) => {
	await page.route('**/api/geocode**', (route) => route.fulfill({ status: 500, json: {} }));

	await page.goto('/');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	await expect(
		page.getByText('Adresse konnte nicht vollständig automatisch ermittelt werden')
	).toBeVisible();
	await expect(page.locator('#locationStreet')).toHaveAttribute('required', '');
	await expect(page.locator('#locationStreet')).toHaveValue('');
	await expect(page.locator('#locationPostcode')).toHaveAttribute('required', '');
	await expect(page.locator('#locationCity')).toHaveAttribute('required', '');
});
