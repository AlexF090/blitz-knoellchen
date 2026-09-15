import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

// Erzeugt einen vollständigen, versendeten Historie-Eintrag über den normalen Formular-Flow —
// es gibt keinen Server-Persistenz-Layer für Historie-Einträge (rein lokale IndexedDB), daher
// lässt sich kein Fixture-Eintrag direkt "einschießen".
const submitReport = async (page: Page, licensePlate: string) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));

	await page.goto('/');
	const appModeDialog = page.getByRole('dialog', { name: 'Demo- oder Live-Modus?' });
	const appModeDialogShown = await appModeDialog
		.waitFor({ state: 'visible', timeout: 2000 })
		.then(() => true)
		.catch(() => false);
	if (appModeDialogShown) await chooseAppMode(page);

	// Ab dem zweiten Aufruf in derselben Test-Session ist das Profil bereits aus IndexedDB
	// gespeichert — das Formular zeigt es dann nur noch als Zusammenfassung statt als Eingabefelder.
	const firstNameField = page.locator('#firstName');
	if (await firstNameField.isVisible().catch(() => false)) {
		await firstNameField.fill('Max');
		await page.locator('#lastName').fill('Mustermann');
		await page.locator('#addressStreet').fill('Musterstraße 1');
		await page.locator('#addressPostcode').fill('50667');
		await page.locator('#addressCity').fill('Köln');
		await page.locator('#email').fill('max@example.com');
	}

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');

	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill(licensePlate);
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');

	await page.getByRole('button', { name: 'Absenden' }).click();

	const successDialog = page.getByRole('dialog', { name: 'Anzeige erfolgreich versendet' });
	await expect(successDialog).toContainText('Anzeige erfolgreich versendet');
	await successDialog.getByRole('link', { name: 'Zur Historie' }).click();
};

test('Löschen eines einzelnen Eintrags fragt vorher nach und entfernt nur diesen', async ({
	page
}) => {
	await submitReport(page, 'K AB 1234');

	await expect(page.getByText('K-AB1234 · Unbekannt · Rot')).toBeVisible();

	await page.getByRole('button', { name: 'Eintrag löschen' }).click();
	const dialog = page.getByRole('dialog', { name: 'Eintrag löschen?' });
	await expect(dialog).toContainText('K-AB1234');

	await dialog.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(page.getByText('K-AB1234 · Unbekannt · Rot')).toBeVisible();

	await page.getByRole('button', { name: 'Eintrag löschen' }).click();
	await page
		.getByRole('dialog', { name: 'Eintrag löschen?' })
		.getByRole('button', { name: 'Löschen' })
		.click();

	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(page.getByText('K-AB1234 · Unbekannt · Rot')).toHaveCount(0);
	await expect(page.getByText('Noch keine Anzeigen versendet.')).toBeVisible();
});

test('Alle löschen fragt vorher nach und leert die gesamte Historie', async ({ page }) => {
	await submitReport(page, 'K AB 1111');
	await submitReport(page, 'K AB 2222');

	await expect(page.getByText('K-AB1111 · Unbekannt · Rot')).toBeVisible();
	await expect(page.getByText('K-AB2222 · Unbekannt · Rot')).toBeVisible();

	const deleteAllTrigger = page.getByRole('main').getByRole('button', { name: 'Alle löschen' });

	await deleteAllTrigger.click();
	const dialog = page.getByRole('dialog', { name: 'Alle Einträge löschen?' });
	await expect(dialog).toContainText('2 Einträge');

	await dialog.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(page.getByText('K-AB1111 · Unbekannt · Rot')).toBeVisible();

	await deleteAllTrigger.click();
	await dialog.getByRole('button', { name: 'Alle löschen' }).click();

	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(page.getByText('Noch keine Anzeigen versendet.')).toBeVisible();
});
