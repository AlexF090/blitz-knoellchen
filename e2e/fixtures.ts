import { test as base, expect } from '@playwright/test';

// Marker für die "Deine Angaben"-E-Mail, den e2e/mocks/brevo-mock-server.mjs erkennt, um gezielt
// einen Brevo-Fehler zu simulieren (s. send-failure-preserves-data.e2e.ts).
export const BREVO_FAILURE_EMAIL = 'max+e2e-brevo-fail@example.com';

const BREVO_MOCK_PORT = 4175;

// Alles, was die Seite selbst ausliefert (App-Origin unter Test), ist erlaubt — inkl. der
// per page.route() in einzelnen Testdateien gezielt gemockten Endpunkte (/api/geocode*), die als
// zuletzt registrierte Route ohnehin Vorrang vor diesem Catch-all haben. Alles andere (jeder
// echte externe Request, der nicht explizit gemockt wurde) wird abgebrochen und als Testfehler
// gemeldet: Kein E2E-Test darf einen echten externen Dienst ansprechen.
const ALLOWED_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+\//;

export interface BrevoMockRequest {
	receivedAt: number;
	body: {
		sender?: { email?: string };
		to?: { email?: string }[];
		replyTo?: { email?: string };
		bcc?: { email?: string }[];
		subject?: string;
		textContent?: string;
		attachment?: { name: string; content: string }[];
	} | null;
}

// Fragt die seit `sinceMs` beim Brevo-Mock eingegangenen "Sende"-Anfragen ab — der Mock läuft
// als eigener, über alle Test-Worker geteilter Prozess, daher immer nach einem Zeitstempel UND
// zusätzlich nach einem für den Test eindeutigen Inhalt filtern (z.B. Kennzeichen im Betreff),
// statt sich auf "die letzte Anfrage" zu verlassen.
export const getBrevoMockRequestsSince = async (sinceMs: number): Promise<BrevoMockRequest[]> => {
	const response = await fetch(
		`http://localhost:${BREVO_MOCK_PORT}/__mock__/requests?since=${sinceMs}`
	);
	if (!response.ok)
		throw new Error(`Brevo-Mock-Introspection fehlgeschlagen: HTTP ${response.status}`);
	return response.json();
};

export const test = base.extend<{ networkGuard: void }>({
	networkGuard: [
		async ({ page }, use) => {
			const violations: string[] = [];
			await page.route('**/*', async (route) => {
				const request = route.request();
				const url = request.url();
				if (ALLOWED_ORIGIN_PATTERN.test(url)) {
					await route.continue();
					return;
				}
				violations.push(`${request.method()} ${url}`);
				await route.abort('failed');
			});

			await use();

			if (violations.length > 0) {
				throw new Error(
					`Unmockter externer Request in E2E-Test entdeckt:\n${violations.join('\n')}`
				);
			}
		},
		{ auto: true }
	]
});

export { expect };
