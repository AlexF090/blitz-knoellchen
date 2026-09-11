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
	await page.locator('[id^="date-"]').fill('2026-03-01');
	await page.locator('[id^="time-"]').fill('14:30');
	await page.locator('[id^="locationStreet-"]').fill('Domkloster');
	await page.locator('[id^="locationPostcode-"]').fill('50667');
	await page.locator('[id^="locationCity-"]').fill('Köln');
	await page.getByLabel('Parken auf dem Gehweg').check();

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByText('Mindestens ein Foto ist erforderlich.')).toBeVisible();
});
