import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Happy Path: Foto -> Auto-Fill -> Absenden -> Historie', async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({ json: { address: 'Domkloster 4, 50667 Köln' } })
	);
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));

	await page.goto('/');

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#address').fill('Musterstraße 1, 50667 Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo').setInputFiles(FIXTURE);

	await expect(page.locator('#locationAddress')).toHaveValue('Domkloster 4, 50667 Köln');
	await expect(page.locator('#date')).toHaveValue('2026-03-01');

	await page.locator('#incidentTypeId').selectOption('gehweg');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('status')).toHaveText('Anzeige erfolgreich versendet.');

	await page.getByRole('link', { name: 'Historie' }).click();
	await expect(page.getByText('Parken auf dem Gehweg')).toBeVisible();
	await expect(page.getByText('Domkloster 4, 50667 Köln')).toBeVisible();
});
