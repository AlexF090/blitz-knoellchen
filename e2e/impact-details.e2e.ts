import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, getBrevoMockRequestsSince, test } from './fixtures';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

const fillBasics = async (page: Page, plate: string) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);
	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	const vehicleBlock = page.locator('[id^="vehicle-block-"]').first();
	await vehicleBlock.getByLabel('Kennzeichen').fill(plate.replace(/(\d)/, ' $1'));
	await vehicleBlock.getByLabel('Fahrzeugart').selectOption('PKW');
	await vehicleBlock.getByLabel('Farbe').fill('Blau');
	await vehicleBlock.getByLabel('Halten/Parken auf dem Gehweg').check();
	return vehicleBlock;
};

const sentBody = async (testStartedAt: number, plate: string) => {
	// Der Brevo-Mock wird von allen parallelen Workern geteilt, daher zusätzlich auf das
	// worker-eindeutige Kennzeichen filtern.
	const requests = await getBrevoMockRequestsSince(testStartedAt);
	const request = requests.find((candidate) => candidate.body?.subject?.includes(plate));
	expect(request).toBeDefined();
	return JSON.stringify(request?.body);
};

test('Ausmaß und gefährdete Personen landen im Haltevorwurf der E-Mail', async ({
	page
}, testInfo) => {
	const testStartedAt = Date.now();
	const plate = `K-IM${100 + testInfo.parallelIndex}`;
	const vehicleBlock = await fillBasics(page, plate);

	await vehicleBlock.getByLabel('Gehweg vollständig blockiert').check();
	await vehicleBlock.getByLabel('Kinder auf dem Schulweg').check();
	await vehicleBlock
		.getByLabel('Weitere Angaben zu gefährdeten Personen')
		.fill('Grundschule direkt gegenüber');

	await page.getByRole('button', { name: 'Absenden' }).click();
	await expect(page.getByRole('dialog', { name: /erfolgreich versendet/ })).toContainText(
		'erfolgreich versendet'
	);

	const body = await sentBody(testStartedAt, plate);
	expect(body).toContain('Halten auf dem Gehweg');
	expect(body).toContain('Das Fahrzeug hielt auf dem Gehweg.');
	expect(body).toContain('Der Gehweg war vollständig blockiert.');
	expect(body).toContain('Kinder auf dem Schulweg');
	expect(body).toContain('Grundschule direkt gegenüber');
});

test('Ein Parkverstoß auf dem Gehweg wird als "parkte" formuliert', async ({ page }, testInfo) => {
	const testStartedAt = Date.now();
	const plate = `K-IP${100 + testInfo.parallelIndex}`;
	const vehicleBlock = await fillBasics(page, plate);

	await vehicleBlock.getByLabel('Parkverstoß (Zeitraum, mind. 4 Min.)').check();
	await vehicleBlock.locator('[id^="time-"]').fill('14:00');
	await vehicleBlock.locator('[id^="endTime-"]').fill('14:10');

	await page.getByRole('button', { name: 'Absenden' }).click();
	await expect(page.getByRole('dialog', { name: /erfolgreich versendet/ })).toContainText(
		'erfolgreich versendet'
	);

	const body = await sentBody(testStartedAt, plate);
	expect(body).toContain('parkte auf dem Gehweg');
});
