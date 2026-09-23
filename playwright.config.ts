import { defineConfig, devices } from '@playwright/test';

const APP_PORT = 4173;
const BREVO_MOCK_PORT = 4175;
const isCi = Boolean(process.env.CI);

export default defineConfig({
	// Ein vergessenes test.only macht die CI rot, statt still den Rest der Suite zu überspringen.
	forbidOnly: isCi,
	// Der HTML-Report landet bei einem Fehlschlag als Artefakt in der CI (s. ci.yml).
	reporter: isCi ? [['dot'], ['html', { open: 'never' }]] : 'list',
	use: {
		// Bei mehreren webServer-Einträgen leitet Playwright `baseURL` nicht mehr automatisch vom
		// einzigen `port` ab (anders als bei einem einzelnen webServer-Objekt) — deshalb hier explizit.
		baseURL: `http://localhost:${APP_PORT}`,
		trace: 'retain-on-failure'
	},
	// Zwei Prozesse: der Brevo-Mock muss stehen, bevor die App-Umgebungsvariable BREVO_API_URL
	// beim Start von `npm run preview` gelesen wird (s. src/routes/api/send/+server.ts) — echte
	// Anfragen an Brevo landen dadurch nie extern, sondern immer bei e2e/mocks/brevo-mock-server.mjs.
	webServer: [
		{
			command: `node e2e/mocks/brevo-mock-server.mjs`,
			port: BREVO_MOCK_PORT,
			env: { BREVO_MOCK_PORT: String(BREVO_MOCK_PORT) }
		},
		{
			// Auf CI baut ein eigener Schritt in ci.yml vorher, lokal baut der webServer selbst.
			command: isCi ? 'npm run preview' : 'npm run build && npm run preview',
			port: APP_PORT,
			env: {
				BREVO_API_URL: `http://localhost:${BREVO_MOCK_PORT}/v3/smtp/email`,
				// Alle Tests senden von localhost aus und würden sonst das Rate-Limit ausschöpfen.
				SEND_LIMIT_PER_HOUR: '1000'
			}
		}
	],
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	]
});
