import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, getBrevoMockRequestsSince, test } from './fixtures';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');
const PHOTO_COUNT = 8;

test('Viele Fotos auf einmal: höchstens drei pro Fahrzeug, nur diese werden gesendet', async ({
	page
}, testInfo) => {
	// Acht Fotos werden nacheinander dekodiert, komprimiert und per Reverse-Geocoding aufgelöst.
	test.setTimeout(120_000);

	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	const testStartedAt = Date.now();
	// parallelIndex ist worker-eindeutig und verhindert Kennzeichen-Kollisionen im geteilten
	// Brevo-Mock (s. multi-vehicle.e2e.ts).
	const plate = `K-MP${300 + testInfo.parallelIndex}`;

	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	const buffer = fs.readFileSync(FIXTURE);
	await page.locator('#photo-pool-input').setInputFiles(
		Array.from({ length: PHOTO_COUNT }, (_, index) => ({
			name: `foto-${index + 1}.jpg`,
			mimeType: 'image/jpeg',
			buffer
		}))
	);

	await expect(page.getByRole('button', { name: /vergrößern$/ })).toHaveCount(PHOTO_COUNT, {
		timeout: 90_000
	});
	await expect(page.getByText(/wird verarbeitet/)).toHaveCount(0);

	const vehicleBlock = page.locator('[id^="vehicle-block-"]').first();
	const selectionButtons = vehicleBlock.getByRole('button', { name: /auswählen$/ });
	await expect(selectionButtons).toHaveCount(PHOTO_COUNT);
	await expect(vehicleBlock.locator('button[aria-pressed="true"]')).toHaveCount(3);
	await expect(selectionButtons.nth(3)).toHaveAttribute('aria-disabled', 'true');
	await expect(
		page.getByText('Maximal 3 Fotos pro Fahrzeug – zum Tauschen zuerst eins abwählen.')
	).toBeVisible();
	await expect(page.getByText('Nicht zugeordnete Fotos werden nicht mitgesendet.')).toBeVisible();

	// Tauschen: erst abwählen, dann ein anderes wählen.
	await selectionButtons.nth(0).click();
	await expect(vehicleBlock.locator('button[aria-pressed="true"]')).toHaveCount(2);
	await selectionButtons.nth(3).click();
	await expect(vehicleBlock.locator('button[aria-pressed="true"]')).toHaveCount(3);
	await expect(selectionButtons.nth(3)).toHaveAttribute('aria-pressed', 'true');
	await expect(selectionButtons.nth(0)).toHaveAttribute('aria-disabled', 'true');

	await vehicleBlock.getByLabel('Kennzeichen').fill(plate.replace(/(\d)/, ' $1'));
	await vehicleBlock.getByLabel('Fahrzeugart').selectOption('PKW');
	await vehicleBlock.getByLabel('Farbe').fill('Blau');
	await vehicleBlock.getByLabel('Halten/Parken auf dem Gehweg').check();

	await page.getByRole('button', { name: 'Absenden' }).click();

	await expect(page.getByRole('dialog', { name: /erfolgreich versendet/ })).toBeVisible();

	const brevoRequests = await getBrevoMockRequestsSince(testStartedAt);
	const ownRequests = brevoRequests.filter((request) => request.body?.subject?.includes(plate));
	expect(ownRequests).toHaveLength(1);
	expect(ownRequests[0].body?.attachment).toHaveLength(3);
});
