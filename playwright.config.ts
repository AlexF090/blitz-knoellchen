import { defineConfig, devices } from '@playwright/test';

const APP_PORT = 4173;
const BREVO_MOCK_PORT = 4175;

export default defineConfig({
	// Bei mehreren webServer-Einträgen leitet Playwright `baseURL` nicht mehr automatisch vom
	// einzigen `port` ab (anders als bei einem einzelnen webServer-Objekt) — deshalb hier explizit.
	use: { baseURL: `http://localhost:${APP_PORT}` },
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
			command: 'npm run build && npm run preview',
			port: APP_PORT,
			env: { BREVO_API_URL: `http://localhost:${BREVO_MOCK_PORT}/v3/smtp/email` }
		}
	],
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	]
});
