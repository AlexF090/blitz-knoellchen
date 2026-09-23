/** Schickt die Anzeige eines Fahrzeugs an /api/send und meldet, ob der Versand geklappt hat. */
export const sendVehicleReport = async (body: FormData): Promise<boolean> => {
	try {
		const response = await fetch('/api/send', { method: 'POST', body });
		return response.ok;
	} catch {
		// Netzwerkfehler (offline, DNS, CORS, ...) liefern dasselbe Ergebnis wie ein
		// HTTP-Fehlerstatus — der Aufrufer unterscheidet nicht zwischen beidem.
		return false;
	}
};
