/**
 * Liest aus einer Brevo-Fehlerantwort nur das Feld `code` (z. B. `invalid_parameter`). Die
 * Fehlermeldung bleibt außen vor. Ohne lesbaren Code liefert die Funktion `'unbekannt'`.
 */
export const readBrevoErrorCode = async (response: Response): Promise<string> => {
	try {
		const body: unknown = await response.json();
		if (typeof body !== 'object' || body === null || !('code' in body)) return 'unbekannt';
		return typeof body.code === 'string' ? body.code : 'unbekannt';
	} catch {
		// Kein JSON, etwa eine HTML-Fehlerseite eines Proxys.
		return 'unbekannt';
	}
};
