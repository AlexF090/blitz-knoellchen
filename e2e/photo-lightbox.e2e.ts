import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

test.beforeEach(async ({ page }) => {
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);
	await page.goto('/');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await expect(page.getByRole('button', { name: /vergrößern/ })).toBeVisible();
});

test('Klick auf Foto öffnet die Lightbox-Vorschau', async ({ page }) => {
	await page.getByRole('button', { name: /vergrößern/ }).click();

	const dialog = page.locator('dialog[open]');
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('img')).toBeVisible();
});

test('Schließen-Button schließt die Lightbox', async ({ page }) => {
	await page.getByRole('button', { name: /vergrößern/ }).click();
	await expect(page.locator('dialog[open]')).toBeVisible();

	await page.getByRole('button', { name: 'Vorschau schließen' }).click();
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('Klick auf Backdrop schließt die Lightbox', async ({ page }) => {
	await page.getByRole('button', { name: /vergrößern/ }).click();
	await expect(page.locator('dialog[open]')).toBeVisible();

	await page.mouse.click(5, 5);
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('Entfernen-Button löst nicht die Lightbox aus und funktioniert weiterhin', async ({
	page
}) => {
	await page.getByRole('button', { name: 'Foto entfernen' }).click();

	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /vergrößern/ })).toHaveCount(0);
});
