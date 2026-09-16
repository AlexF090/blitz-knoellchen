import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';
import { test, expect } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

const fillCompleteForm = async (page: import('@playwright/test').Page) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	await page.locator('#firstName').fill('Max');
	await page.locator('#lastName').fill('Mustermann');
	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#email').fill('max@example.com');

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await expect(page.locator('[id^="locationStreet-"]')).toHaveValue('Domkloster');

	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill('K-AB 1234');
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill('Rot');
};

const getPreviewRecipient = (page: import('@playwright/test').Page) => {
	const previewDialog = page.getByRole('dialog', { name: 'Vorschau' });
	return previewDialog.locator('xpath=.//p[text()="An"]/following-sibling::p[1]');
};

test('Dialog erscheint beim ersten Laden und lässt sich nicht per Escape oder Backdrop-Klick schließen', async ({
	page
}) => {
	await page.goto('/');

	const dialog = page.getByRole('dialog', { name: 'Demo- oder Live-Modus?' });
	await expect(dialog).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(dialog).toBeVisible();

	// Klick auf den Backdrop-Bereich, außerhalb des zentrierten Dialog-Inhalts.
	await page.mouse.click(5, 5);
	await expect(dialog).toBeVisible();
});

test('Demo-Modus: Badge im Header und Test-Adresse in der E-Mail-Vorschau', async ({ page }) => {
	await page.goto('/');
	await chooseAppMode(page, 'demo');

	// Nicht auf dem Dialog selbst assertieren: die CSS-Exit-Animation (layout.css,
	// `transition: display 300ms allow-discrete`) hält ihn in manchen Browsern optisch noch kurz
	// im Layout, ohne dass er nach dem Schließen noch etwas blockiert (choose() setzt
	// pointer-events: none synchron). Stattdessen auf ein Element *hinter* dem Dialog prüfen.
	await expect(page.locator('#firstName')).toBeEditable();
	await expect(page.getByText('Demo', { exact: true })).toBeVisible();

	await fillCompleteForm(page);

	await page.getByRole('button', { name: 'Vorschau' }).click();

	const recipient = getPreviewRecipient(page);
	await expect(recipient).toBeVisible();
	const recipientText = (await recipient.textContent())?.trim();
	expect(recipientText).toMatch(/^\S+@\S+\.\S+$/);
	expect(recipientText).not.toBe('bussgeldstelle@stadt-koeln.de');
});

test('Nach hartem Reload bleibt die Wahl innerhalb der Session erhalten', async ({ page }) => {
	await page.goto('/');
	await chooseAppMode(page, 'demo');
	// Nicht auf dem Dialog selbst assertieren: die CSS-Exit-Animation (layout.css,
	// `transition: display 300ms allow-discrete`) hält ihn in manchen Browsern optisch noch kurz
	// im Layout, ohne dass er nach dem Schließen noch etwas blockiert (choose() setzt
	// pointer-events: none synchron). Stattdessen auf ein Element *hinter* dem Dialog prüfen.
	await expect(page.locator('#firstName')).toBeEditable();

	await page.reload();
	// Nicht auf dem Dialog selbst assertieren: die CSS-Exit-Animation (layout.css,
	// `transition: display 300ms allow-discrete`) hält ihn in manchen Browsern optisch noch kurz
	// im Layout, ohne dass er nach dem Schließen noch etwas blockiert (choose() setzt
	// pointer-events: none synchron). Stattdessen auf ein Element *hinter* dem Dialog prüfen.
	await expect(page.locator('#firstName')).toBeEditable();
	await expect(page.getByText('Demo', { exact: true })).toBeVisible();
});

test('Klick auf das Modus-Badge im Header öffnet den Dialog erneut und erlaubt einen Wechsel', async ({
	page
}) => {
	await page.goto('/');
	await chooseAppMode(page, 'demo');
	await expect(page.getByText('Demo', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Modus wechseln (aktuell Demo)' }).click();
	await expect(page.getByRole('dialog', { name: 'Demo- oder Live-Modus?' })).toBeVisible();

	await chooseAppMode(page, 'live');
	// Nicht auf dem Dialog selbst assertieren: die CSS-Exit-Animation (layout.css,
	// `transition: display 300ms allow-discrete`) hält ihn in manchen Browsern optisch noch kurz
	// im Layout, ohne dass er nach dem Schließen noch etwas blockiert (choose() setzt
	// pointer-events: none synchron). Stattdessen auf ein Element *hinter* dem Dialog prüfen.
	await expect(page.locator('#firstName')).toBeEditable();
	await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('Live-Modus: Badge im Header und echte Bußgeldstelle-Adresse in der E-Mail-Vorschau', async ({
	page
}) => {
	await page.goto('/');
	await chooseAppMode(page, 'live');

	// Nicht auf dem Dialog selbst assertieren: die CSS-Exit-Animation (layout.css,
	// `transition: display 300ms allow-discrete`) hält ihn in manchen Browsern optisch noch kurz
	// im Layout, ohne dass er nach dem Schließen noch etwas blockiert (choose() setzt
	// pointer-events: none synchron). Stattdessen auf ein Element *hinter* dem Dialog prüfen.
	await expect(page.locator('#firstName')).toBeEditable();
	await expect(page.getByText('Live', { exact: true })).toBeVisible();

	await fillCompleteForm(page);

	await page.getByRole('button', { name: 'Vorschau' }).click();

	// In CI ist RECIPIENT_EMAIL_LIVE eine Dummy-Adresse (s. ci.yml) statt der echten
	// Bußgeldstelle-Adresse — der Test prüft die konfigurierte Adresse, nicht einen Literal-Wert.
	const expectedRecipient = process.env.RECIPIENT_EMAIL_LIVE ?? 'bussgeldstelle@stadt-koeln.de';
	await expect(getPreviewRecipient(page)).toHaveText(expectedRecipient);
});
