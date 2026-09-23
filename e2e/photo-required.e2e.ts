import { chooseAppMode } from './helpers/appMode';
import { test, expect } from './fixtures';

test('Absenden ohne Foto zeigt Fehlermeldung', async ({ page }) => {
	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	// Die erste Fahrzeug-Karte entsteht erst mit dem ersten Foto. Ohne Foto gibt es also keine
	// Datum/Adresse/Verstoßart-Felder zum Ausfüllen.
	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(
		page.getByText('Mindestens ein Foto ist erforderlich.', { exact: true })
	).toBeVisible();
});
