import { test, expect } from '@playwright/test';

test('Absenden ohne Foto zeigt Fehlermeldung', async ({ page }) => {
	await page.goto('/');

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße');
	await page.locator('#addressHouseNumber').fill('1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	// Ohne Foto existiert seit "erste Fahrzeug-Karte erst nach Foto anlegen" noch gar keine
	// Fahrzeug-Karte — es gibt also keine Datum/Adresse/Verstoßart-Felder zum Ausfüllen.
	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(
		page.getByText('Mindestens ein Foto ist erforderlich.', { exact: true })
	).toBeVisible();
});
