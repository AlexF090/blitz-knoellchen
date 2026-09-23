// Erzeugt die README-Screenshots reproduzierbar aus der echten App, statt sie manuell
// abzufotografieren. Aufruf: `node scripts/generate-screenshots.mjs`
//
// Läuft bewusst gegen den Production-Build und denselben Brevo-Mock wie die E2E-Tests
// (s. playwright.config.ts), damit auch der Versand-Screenshot einen echten Durchlauf zeigt,
// ohne dass eine E-Mail das Haus verlässt.
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots');
const FIXTURE = path.join(ROOT, 'e2e/fixtures/photo-with-gps.jpg');

const APP_PORT = 4273;
const BREVO_MOCK_PORT = 4275;
const BASE_URL = `http://localhost:${APP_PORT}`;

// Überschreibt alle Werte, die sichtbar in einem Screenshot landen können. Insbesondere die
// Empfänger-Adressen: die echten aus der lokalen .env sind private bzw. Behördenadressen und
// haben in einem öffentlichen README nichts zu suchen.
const PLACEHOLDER_ENV = {
	EMAIL_FROM: 'anzeige@blitz-knoellchen.example',
	RECIPIENT_EMAIL_DEMO: 'demo-empfaenger@example.org',
	RECIPIENT_EMAIL_LIVE: 'bussgeldstelle@example.org',
	BREVO_API_KEY: 'screenshot-dummy-key',
	LOCATIONIQ_API_KEY: 'screenshot-dummy-key'
};

// Frei erfundene Anzeige — keine realen Personen-, Adress- oder Kennzeichendaten im README.
const DEMO_DATA = {
	firstName: 'Alex',
	lastName: 'Beispiel',
	addressStreet: 'Musterweg 7',
	addressPostcode: '50733',
	addressCity: 'Köln',
	email: 'alex.beispiel@example.org',
	licensePlate: 'K XY 4711',
	color: 'Dunkelblau'
};

const waitForServer = async (url, timeoutMs = 180_000) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(url);
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
	throw new Error(`Server unter ${url} war nach ${timeoutMs} ms nicht erreichbar.`);
};

const startProcess = (command, args, env) => {
	const child = spawn(command, args, {
		cwd: ROOT,
		env: { ...process.env, ...env },
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	child.on('error', (error) => {
		console.error(`Prozess "${command}" fehlgeschlagen:`, error);
		process.exit(1);
	});
	return child;
};

const run = async () => {
	await rm(OUT_DIR, { recursive: true, force: true });
	await mkdir(OUT_DIR, { recursive: true });

	const brevoMock = startProcess('node', ['e2e/mocks/brevo-mock-server.mjs'], {
		BREVO_MOCK_PORT: String(BREVO_MOCK_PORT)
	});
	await waitForServer(`http://localhost:${BREVO_MOCK_PORT}/__mock__/requests?since=0`);

	// Die Empfänger-Adressen MÜSSEN schon beim Build überschrieben werden: sie stammen aus
	// `$env/static/private` und werden dort fest eingebacken. Ohne das landet die echte Adresse
	// aus der lokalen .env in der E-Mail-Vorschau — und damit in einem Screenshot im README.
	const app = startProcess('npm', ['run', 'build'], PLACEHOLDER_ENV);
	await new Promise((resolve, reject) => {
		app.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('Build fehlgeschlagen'))));
	});

	const preview = startProcess('npm', ['run', 'preview', '--', '--port', String(APP_PORT)], {
		...PLACEHOLDER_ENV,
		BREVO_API_URL: `http://localhost:${BREVO_MOCK_PORT}/v3/smtp/email`
	});
	await waitForServer(BASE_URL);

	const browser = await chromium.launch();
	const context = await browser.newContext({ ...devices['Pixel 7'] });
	const page = await context.newPage();

	// Dieselbe feste Adresse wie im E2E-Happy-Path — der Screenshot soll nicht von der
	// Verfügbarkeit oder dem Kontingent eines externen Geocoding-Dienstes abhängen.
	await page.route('**/api/geocode**', (route) =>
		route.fulfill({
			json: {
				address: { street: 'Domkloster', houseNumber: '4', postcode: '50667', city: 'Köln' }
			}
		})
	);

	/**
	 * Schreibt einen Screenshot. Ohne `anchor` wird an den Seitenanfang gescrollt; mit `anchor`
	 * an das passende Element — sonst zeigt das Bild die Stelle, an der das letzte ausgefüllte
	 * Feld stand, statt den Zustand, um den es geht.
	 */
	const shot = async (name, anchor) => {
		if (anchor) {
			await anchor.first().scrollIntoViewIfNeeded();
			// Der Header liegt sticky über dem Inhalt und würde die oberste Zeile verdecken.
			await page.evaluate(() => window.scrollBy(0, -96));
		} else {
			await page.evaluate(() => window.scrollTo(0, 0));
		}
		await page.waitForTimeout(400); // Ein-/Ausblend-Transitionen ausklingen lassen
		await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
		console.log(`✓ ${name}.png`);
	};

	await page.goto(BASE_URL);
	await page
		.getByRole('dialog', { name: 'Demo- oder Live-Modus?' })
		.getByRole('button', { name: 'Demo verwenden' })
		.click();
	await shot('01-formular');

	await page.locator('#firstName').fill(DEMO_DATA.firstName);
	await page.locator('#lastName').fill(DEMO_DATA.lastName);
	await page.locator('#addressStreet').fill(DEMO_DATA.addressStreet);
	await page.locator('#addressPostcode').fill(DEMO_DATA.addressPostcode);
	await page.locator('#addressCity').fill(DEMO_DATA.addressCity);
	await page.locator('#email').fill(DEMO_DATA.email);
	await page.getByRole('button', { name: 'Speichern' }).click();

	await page.locator('#photo-pool-input').setInputFiles(FIXTURE);
	await page.locator('[id^="locationStreet-"]').waitFor();
	await page.getByLabel('Parken auf dem Gehweg').check();
	await page.getByLabel('Kennzeichen').fill(DEMO_DATA.licensePlate);
	await page.getByLabel('Fahrzeugart').selectOption('PKW');
	await page.getByLabel('Farbe').fill(DEMO_DATA.color);
	await page.locator('[id^="locationCity-"]').blur();
	// Kernaussage des Bildes: das Foto liegt im Pool, und Tatort/Datum darunter sind bereits
	// aus dessen EXIF-Daten befüllt.
	await shot('02-vorgang-ausgefuellt', page.getByRole('heading', { name: 'Beweisfotos' }));

	await page.getByRole('button', { name: 'Vorschau' }).first().click();
	await shot('03-email-vorschau');
	await page.getByRole('button', { name: 'Schließen' }).click();

	await page.getByRole('button', { name: 'Absenden' }).click();
	await page.getByRole('dialog', { name: /erfolgreich versendet/ }).waitFor();
	await shot('04-versendet');

	await page.getByRole('link', { name: 'Zur Historie' }).click();
	await page.waitForURL('**/historie');
	await shot('05-historie');

	await browser.close();
	preview.kill();
	brevoMock.kill();
	console.log(`\nScreenshots liegen in ${path.relative(ROOT, OUT_DIR)}/`);
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
