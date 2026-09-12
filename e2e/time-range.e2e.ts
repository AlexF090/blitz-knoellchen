import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test.beforeEach(async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	await page.goto('/');
	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
});

test('Halteverstoß ist der Standard und zeigt nur einen Einzelzeitpunkt', async ({ page }) => {
	await expect(page.getByLabel('Halteverstoß (Einzelzeitpunkt)')).toBeChecked();
	await expect(page.locator('[id^="endTime-"]')).toHaveCount(0);
});

test('Umschalten auf Parkverstoß zeigt Von/Bis-Felder', async ({ page }) => {
	await page.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();

	await expect(page.locator('[id^="endTime-"]')).toHaveCount(1);
});

test('Zeitraum unter 4 Minuten blockiert das Absenden mit Fehlermeldung', async ({ page }) => {
	await page.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();
	await page.locator('[id^="time-"]').fill('14:00');
	await page.locator('[id^="endTime-"]').fill('14:02');
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(
		page
			.getByText('Für einen Parkverstoß ist eine Mindestparkzeit von 4 Minuten erforderlich.')
			.first()
	).toBeVisible();
});

test('Zeitraum von mindestens 4 Minuten sendet erfolgreich', async ({ page }) => {
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));

	await page.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();
	await page.locator('[id^="time-"]').fill('14:00');
	await page.locator('[id^="endTime-"]').fill('14:04');
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('status')).toHaveText('Anzeige erfolgreich versendet.');
});

test('Zurück zu Halteverstoß leert das Bis-Feld', async ({ page }) => {
	await page.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();
	await page.locator('[id^="endTime-"]').fill('14:04');

	await page.getByLabel('Halteverstoß (Einzelzeitpunkt)').check();
	await expect(page.locator('[id^="endTime-"]')).toHaveCount(0);

	await page.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();
	await expect(page.locator('[id^="endTime-"]')).toHaveValue('');
});
