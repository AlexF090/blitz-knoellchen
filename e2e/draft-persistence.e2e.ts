import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { chooseAppMode } from './helpers/appMode';
import { test, expect } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test.use({ serviceWorkers: 'block' });

const mockGeocode = (page: Page) =>
	page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

const fillProfile = async (page: Page) => {
	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');
};

const addVehicleFromPhoto = async (page: Page) => {
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await expect(page.locator('[id^="date-"]')).toHaveValue('2026-03-01');
};

test('Fahrzeugdaten überleben einen Reload als Entwurf', async ({ page }) => {
	await mockGeocode(page);

	await page.goto('/');
	await chooseAppMode(page);

	await fillProfile(page);
	await addVehicleFromPhoto(page);

	await page.locator('[id^="locationStreet-"]').fill('Domkloster');
	await page.locator('[id^="locationPostcode-"]').fill('50667');
	await page.locator('[id^="locationCity-"]').fill('Köln');
	await page.getByLabel('Halten/Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');

	// Autosave ist debounced (800ms) — kurz warten, bevor neu geladen wird.
	await page.waitForTimeout(1200);

	// sessionStorage überlebt den Reload (s. ADR "Live-Modus als Standard" in
	// docs/architektur.md), der Demo-Modus bleibt ohne erneuten Wechsel aktiv.
	await page.reload();

	// Kein Flash: "Deine Angaben" soll sofort im gelesenen Zustand stehen, nie leer im
	// Bearbeiten-Modus aufblitzen.
	await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
	await expect(page.getByText('Max Mustermann')).toBeVisible();

	// Der Entwurf wartet auf die Entscheidung, bis dahin zeigt das Formular keine Fahrzeuge.
	await expect(page.getByRole('region', { name: 'Entwurf fortsetzen?' })).toBeVisible();
	await expect(page.getByLabel('Kennzeichen')).toHaveCount(0);
	await page.getByRole('button', { name: 'Fortsetzen' }).click();

	await expect(page.getByLabel('Kennzeichen')).toHaveValue('K-AB 1234');
	await expect(page.getByLabel('Fahrzeugart')).toHaveValue('PKW');
	await expect(page.getByLabel('Halten/Parken auf dem Gehweg')).toBeChecked();
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');
});

test('Verwerfen mit Bestätigung leert das Formular und der Hinweis kommt nicht wieder', async ({
	page
}) => {
	await mockGeocode(page);
	await page.goto('/');
	await chooseAppMode(page);
	await fillProfile(page);
	await addVehicleFromPhoto(page);
	await page.waitForTimeout(1200);
	await page.reload();

	await page.getByRole('button', { name: 'Verwerfen' }).click();
	await page
		.getByRole('dialog', { name: 'Entwurf verwerfen?' })
		.getByRole('button', { name: 'Verwerfen' })
		.click();

	await expect(page.getByRole('region', { name: 'Entwurf fortsetzen?' })).toHaveCount(0);
	await expect(page.getByLabel('Kennzeichen')).toHaveCount(0);
	await expect(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' })).toBeVisible();

	await page.reload();
	await expect(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Entwurf fortsetzen?' })).toHaveCount(0);
});

test('Verstecken des Tabs speichert den Entwurf sofort, ohne die Entprellzeit abzuwarten', async ({
	page,
	context
}) => {
	await mockGeocode(page);
	await page.goto('/');
	await chooseAppMode(page);
	await fillProfile(page);
	await addVehicleFromPhoto(page);
	// Erst warten, bis der Stand der Fotozuordnung gespeichert ist, damit nur der Flush beim
	// Verstecken das Kennzeichen und das Zuklappen speichern kann.
	await page.waitForTimeout(1200);

	await expect(page.locator('[id^="locationCity-"]')).toHaveValue('Köln');
	await page.getByLabel('Halten/Parken auf dem Gehweg').check();
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');
	await page.getByLabel('Kennzeichen').fill('K-ZZ 9999');
	await page.getByRole('button', { name: 'Fertig' }).click();
	await expect(
		page.locator('[id^="vehicle-block-"]').getByRole('button', { name: 'Bearbeiten' })
	).toBeVisible();

	// Ein echtes Schließen des Tabs taugt hier nicht: Chromium bricht IndexedDB-Schreibvorgänge
	// aus `pagehide` beim Beenden des Renderers ab (auch ein reiner `put` ohne Anwendungscode
	// geht verloren). `visibilitychange` läuft dagegen, solange die Seite noch lebt — der
	// verlässlichere Auslöser, vor allem auf iOS.
	const other = await context.newPage();
	await other.goto('/');
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
		document.dispatchEvent(new Event('visibilitychange'));
	});

	// Kürzer als die Entprellzeit von 800 ms: Nur der Flush kann den Stand bis dahin geschrieben haben.
	await expect
		.poll(
			() =>
				other.evaluate(
					() =>
						new Promise<{ plate: string; collapsed: string[] } | null>((resolve) => {
							const request = indexedDB.open('blitz-knoellchen');
							request.onsuccess = () => {
								const read = request.result
									.transaction('draft')
									.objectStore('draft')
									.get('default');
								read.onsuccess = () =>
									resolve(
										read.result
											? {
													plate: read.result.vehicles[0].licensePlate,
													collapsed: read.result.ui.collapsedVehicleIds
												}
											: null
									);
							};
						})
				),
			{ timeout: 500 }
		)
		.toMatchObject({ plate: 'K-ZZ9999', collapsed: [expect.any(String)] });

	await page.close();
	await other.reload();
	await expect(other.getByRole('region', { name: 'Entwurf fortsetzen?' })).toBeVisible();
	await other.getByRole('button', { name: 'Fortsetzen' }).click();

	const vehicleBlock = other.locator('[id^="vehicle-block-"]');
	await expect(vehicleBlock.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
	await vehicleBlock.getByRole('button', { name: 'Bearbeiten' }).click();
	await expect(other.getByLabel('Kennzeichen')).toHaveValue('K-ZZ9999');
});
