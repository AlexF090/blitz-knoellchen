import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, getBrevoMockRequestsSince, test } from './fixtures';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test('Mehrere Fahrzeuge: ein Foto wird für zwei getrennte Anzeigen verwendet', async ({
	page
}, testInfo) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	// /api/send läuft real gegen den Brevo-Mock (s. fixtures.ts) — das tatsächlich an Brevo
	// geschickte Kennzeichen steht im E-Mail-Betreff (s. buildEmailBody.ts), nicht mehr in einem
	// hier abgefangenen FormData-Feld.
	const testStartedAt = Date.now();
	// parallelIndex ist über alle Worker (auch projektübergreifend, z.B. desktop+mobile) innerhalb
	// eines Testlaufs eindeutig — verhindert Kennzeichen-Kollisionen, wenn dieser Test parallel in
	// mehreren Projekten läuft.
	const plateA = `K-AA${100 + testInfo.parallelIndex}`;
	const plateB = `K-BB${200 + testInfo.parallelIndex}`;

	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	const vehicleBlocks = page.locator('[id^="vehicle-block-"]');
	await expect(vehicleBlocks).toHaveCount(1);
	await vehicleBlocks.first().getByLabel('Kennzeichen').fill(plateA.replace(/(\d)/, ' $1'));
	await vehicleBlocks.first().getByLabel('Fahrzeugart').selectOption('PKW');
	await vehicleBlocks.first().getByLabel('Farbe').fill('Blau');
	await vehicleBlocks.first().getByLabel('Parken auf dem Gehweg').check();

	await page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }).click();
	await expect(vehicleBlocks).toHaveCount(2);

	const secondVehicle = vehicleBlocks.nth(1);
	await secondVehicle.getByRole('button', { name: /auswählen/ }).click();
	await secondVehicle.getByLabel('Kennzeichen').fill(plateB.replace(/(\d)/, ' $1'));
	await secondVehicle.getByLabel('Fahrzeugart').selectOption('PKW');
	await secondVehicle.getByLabel('Farbe').fill('Grün');
	await secondVehicle.getByLabel('Parken im Halteverbot').check();

	await page.getByRole('button', { name: 'Absenden' }).click();

	// Namentlich scopen, nicht bloß page.getByRole('dialog'): der (geschlossene, aber wegen
	// CSS-Exit-Animation kurz noch im A11y-Baum sichtbare) AppModeDialog würde sonst ebenfalls
	// treffen (s. layout.css, "dialog { transition: ... display 300ms allow-discrete ... }").
	await expect(
		page.getByRole('dialog', { name: 'Alle 2 Anzeigen erfolgreich versendet' })
	).toContainText('Alle 2 Anzeigen erfolgreich versendet');
	// Der Brevo-Mock läuft als ein über alle parallelen Test-Worker geteilter Prozess — "seit
	// testStartedAt" reicht allein nicht zur Isolation, andere Tests können im selben Zeitfenster
	// senden. Zusätzlich auf die für diesen Test eindeutigen Kennzeichen filtern.
	const brevoRequests = await getBrevoMockRequestsSince(testStartedAt);
	const expectedPlates = [plateA, plateB];
	const sentLicensePlateCounts = expectedPlates.map(
		(plate) => brevoRequests.filter((request) => request.body?.subject?.includes(plate)).length
	);
	// Pro Kennzeichen zählen statt nur auf Existenz zu prüfen — sonst bleiben Doppel-Sends für ein
	// Fahrzeug unentdeckt. Die Kennzeichen sind über parallelIndex worker-eindeutig, daher ist die
	// exakte Zählung auch bei parallel laufenden Projekten (desktop+mobile) verlässlich.
	expect(sentLicensePlateCounts).toEqual([1, 1]);
});
