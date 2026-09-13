import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAppMode } from './helpers/appMode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/photo-with-gps.jpg');

const SUGGESTIONS = [
	{
		display_name: 'Domkloster 4, 50667 Köln',
		address: { road: 'Domkloster', house_number: '4', postcode: '50667', city: 'Köln' }
	},
	{
		display_name: 'Domkloster 5, 50667 Köln',
		address: { road: 'Domkloster', house_number: '5', postcode: '50667', city: 'Köln' }
	}
];

test.beforeEach(async ({ page }) => {
	await page.route('**/api/geocode/autocomplete**', (route) =>
		route.fulfill({
			json: {
				suggestions: SUGGESTIONS.map((s) => ({
					label: s.display_name,
					street: s.address.road,
					houseNumber: s.address.house_number,
					postcode: s.address.postcode,
					city: s.address.city
				}))
			}
		})
	);
	await page.route('**/api/send', (route) => route.fulfill({ json: { ok: true } }));
});

test('Adress-Autocomplete bei "Deine Angaben": Tippen zeigt Vorschläge, Klick befüllt Feld', async ({
	page
}) => {
	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#addressStreet').fill('Domkloster');

	const options = page.getByRole('option');
	await expect(options).toHaveCount(2);
	await options.first().click();

	await expect(page.locator('#addressStreet')).toHaveValue('Domkloster 4');
	await expect(page.locator('#addressPostcode')).toHaveValue('50667');
	await expect(page.locator('#addressCity')).toHaveValue('Köln');
});

test('Adress-Autocomplete bei "Deine Angaben": Tastatur-Navigation (ArrowDown+Enter)', async ({
	page
}) => {
	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#addressStreet').fill('Domkloster');
	await expect(page.getByRole('option')).toHaveCount(2);

	await page.locator('#addressStreet').press('ArrowDown');
	await page.locator('#addressStreet').press('ArrowDown');
	await page.locator('#addressStreet').press('Enter');

	await expect(page.locator('#addressStreet')).toHaveValue('Domkloster 5');
});

test('Adress-Autocomplete beim Tatort: Klick befüllt Straße, Hausnr., PLZ und Ort', async ({
	page
}) => {
	// Eigenes, engeres Pattern (nicht "**/api/geocode**"), damit dieser Mock nicht mit dem
	// Autocomplete-Mock aus beforeEach kollidiert — das Foto-Upload löst Reverse-Geocoding aus.
	await page.route('**/api/geocode?lat=**', (route) => route.fulfill({ json: { error: 'n/a' } }));

	await page.goto('/');
	await chooseAppMode(page);

	await page.locator('#addressStreet').fill('Musterstraße 1');
	await page.locator('#addressPostcode').fill('50667');
	await page.locator('#addressCity').fill('Köln');
	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);

	const locationStreetInput = page.locator('[id^="locationStreet-"]');
	await locationStreetInput.fill('Domkloster');

	// Auf die Listbox scopen statt page-weit: page.getByRole('option') träfe sonst auch die
	// <option>-Kinder des nativen "Fahrzeugart"-<select>, das durch den Foto-Upload mitgerendert wird.
	const options = page.getByRole('listbox').getByRole('option');
	await expect(options).toHaveCount(2);
	await options.first().click();

	await expect(locationStreetInput).toHaveValue('Domkloster');
	await expect(page.locator('[id^="locationHouseNumber-"]')).toHaveValue('4');
	await expect(page.locator('[id^="locationPostcode-"]')).toHaveValue('50667');
	await expect(page.locator('[id^="locationCity-"]')).toHaveValue('Köln');
});
