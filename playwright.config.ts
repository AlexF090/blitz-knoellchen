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
		trace: 'retain-on-failure',
		// Anfragen, die der Service Worker abfängt, sieht page.route() nicht: Gemockte Endpunkte
		// liefen sonst ins echte Netz. Nur e2e/service-worker.e2e.ts lässt ihn zu.
		serviceWorkers: 'block'
	},
	// Zwei Prozesse: der Brevo-Mock muss stehen, bevor die App startet. BREVO_API_URL zeigt per
	// `--var` auf ihn (s. src/routes/api/send/+server.ts) — echte Anfragen an Brevo landen dadurch
	// nie extern, sondern immer bei e2e/mocks/brevo-mock-server.mjs.
	webServer: [
		{
			command: `node e2e/mocks/brevo-mock-server.mjs`,
			port: BREVO_MOCK_PORT,
			env: { BREVO_MOCK_PORT: String(BREVO_MOCK_PORT) }
		},
		{
			// Auf CI baut ein eigener Schritt in ci.yml vorher, lokal baut der webServer selbst.
			// `npm run preview` ist `wrangler dev`: der gebaute Worker in workerd wie in Produktion.
			// `--var` hat Vorrang vor .env und .dev.vars. SEND_LIMIT_PER_MINUTE ersetzt das
			// Rate-Limit-Binding, weil alle Tests von localhost aus senden.
			command: [
				...(isCi ? [] : ['npm run build &&']),
				`npm run preview -- --port ${APP_PORT}`,
				`--var BREVO_API_URL:http://localhost:${BREVO_MOCK_PORT}/v3/smtp/email`,
				'--var SEND_LIMIT_PER_MINUTE:1000'
			].join(' '),
			port: APP_PORT,
			env: {
				// Ohne .dev.vars liest wrangler dev nur .env; in der CI stehen die Werte in der
				// Prozessumgebung (s. ci.yml).
				CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true'
			}
		}
	],
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	]
});
