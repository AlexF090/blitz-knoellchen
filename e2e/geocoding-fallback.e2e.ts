import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Geocoding-Fehler: manuelles Adressfeld wird Pflicht', async ({ page }) => {
	await page.route('**/api/geocode**', (route) => route.fulfill({ status: 500, json: {} }));
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));

	await page.goto('/');
	await chooseAppMode(page);
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	await expect(
		page.getByText('Adresse konnte nicht vollständig automatisch ermittelt werden')
	).toBeVisible();
	await expect(page.locator('[id^="locationStreet-"]')).toHaveAttribute('required', '');
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('');
	await expect(page.locator('[id^="locationPostcode-"]')).toHaveAttribute('required', '');
	await expect(page.locator('[id^="locationCity-"]')).toHaveAttribute('required', '');
});
