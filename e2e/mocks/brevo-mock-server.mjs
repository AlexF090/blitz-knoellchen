// Lokaler Ersatz für die echte Brevo-API während E2E-Tests. Läuft als eigener Playwright-
// `webServer`-Prozess (s. playwright.config.ts); die App zeigt über BREVO_API_URL hierhin statt auf
// `https://api.brevo.com`, sodass `src/routes/api/send/+server.ts` real durchläuft (Validierung,
// E-Mail-Aufbau, Anhang-Encoding), aber keine echte E-Mail verschickt wird.
//
// Bewusst plain Node (`node:http`), keine neue Dependency — der Server ist trivial genug, dass
// Express/Fastify o.ä. keinen Mehrwert böte (s. CLAUDE.md, "jede Dependency muss begründet werden").
import { createServer } from 'node:http';

const PORT = Number(process.env.BREVO_MOCK_PORT ?? 4175);

// Enthält jede empfangene "Sende"-Anfrage — von Tests über /__mock__/requests abrufbar, um zu
// prüfen, was der echte Server-Endpunkt tatsächlich an Brevo geschickt hätte. Absichtlich ein
// einfaches Array ohne Reset-zwischen-Tests: Tests filtern selbst nach `since` + eigenen,
// eindeutigen Markern (z.B. Kennzeichen im Betreff), damit paralleles Ausführen keine Race
// Conditions zwischen Tests erzeugt.
const requests = [];

// Marker, den ein Test in eine E-Mail-Adresse einbaut (z.B. "max+e2e-brevo-fail@example.com" als
// "Deine Angaben"-E-Mail), um gezielt einen Brevo-Fehler zu simulieren, ohne den Mock-Server
// global auf "immer Fehler" umzuschalten oder einen Zustand zwischen Tests zu teilen.
const FAILURE_MARKER = 'e2e-brevo-fail';

const readBody = async (req) => {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf-8');
};

const sendJson = (res, status, payload) => {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(body)
	});
	res.end(body);
};

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);

	if (req.method === 'GET' && url.pathname === '/__mock__/requests') {
		const since = Number(url.searchParams.get('since') ?? 0);
		sendJson(
			res,
			200,
			requests.filter((entry) => entry.receivedAt >= since)
		);
		return;
	}

	if (req.method === 'POST' && url.pathname === '/v3/smtp/email') {
		const rawBody = await readBody(req);
		let body = null;
		try {
			body = JSON.parse(rawBody);
		} catch {
			// Ungültiges JSON wird unten wie ein leerer Body behandelt (kein Marker-Treffer, Erfolg).
		}
		requests.push({ receivedAt: Date.now(), body });

		const candidateEmails = [
			body?.sender?.email,
			body?.replyTo?.email,
			...(Array.isArray(body?.bcc) ? body.bcc.map((entry) => entry?.email) : [])
		];
		const shouldSimulateFailure = candidateEmails.some(
			(email) => typeof email === 'string' && email.includes(FAILURE_MARKER)
		);

		if (shouldSimulateFailure) {
			sendJson(res, 500, { code: 'internal_error', message: 'Simulated Brevo failure (e2e mock)' });
			return;
		}

		sendJson(res, 201, { messageId: 'e2e-mock-message-id' });
		return;
	}

	res.writeHead(404);
	res.end();
});

server.listen(PORT, () => {
	console.log(`[e2e mock] Brevo-Mock läuft auf http://localhost:${PORT}`);
});
