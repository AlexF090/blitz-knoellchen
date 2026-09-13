import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Mehrere Fahrzeuge: ein Foto wird für zwei getrennte Anzeigen verwendet', async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	const sentLicensePlates: string[] = [];
	await page.route('**/api/send', async (route) => {
		const body = route.request().postData() ?? '';
		const match = /name="licensePlate"\r\n\r\n([^\r]*)/.exec(body);
		if (match) sentLicensePlates.push(match[1]);
		await route.fulfill({ json: { ok: true } });
	});

	await page.goto('/');

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	const vehicleBlocks = page.locator('[id^="vehicle-block-"]');
	await expect(vehicleBlocks).toHaveCount(1);
	await vehicleBlocks.first().getByLabel('Kennzeichen').fill('K-AA 111');
	await vehicleBlocks.first().getByLabel('Fahrzeugart').selectOption('PKW');
	await vehicleBlocks.first().getByLabel('Farbe').fill('Blau');
	await vehicleBlocks.first().getByLabel('Parken auf dem Gehweg').check();

	await page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }).click();
	await expect(vehicleBlocks).toHaveCount(2);

	const secondVehicle = vehicleBlocks.nth(1);
	await secondVehicle.getByRole('button', { name: /auswählen/ }).click();
	await secondVehicle.getByLabel('Kennzeichen').fill('K-BB 222');
	await secondVehicle.getByLabel('Fahrzeugart').selectOption('PKW');
	await secondVehicle.getByLabel('Farbe').fill('Grün');
	await secondVehicle.getByLabel('Parken im Halteverbot').check();

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('dialog')).toContainText('Alle 2 Anzeigen erfolgreich versendet');
	expect(sentLicensePlates.sort()).toEqual(['K-AA 111', 'K-BB 222']);
});
