// Netzwerkfehler (offline, DNS, CORS, ...) sollen dasselbe Fehlschlag-Ergebnis liefern wie ein
// HTTP-Fehlerstatus von /api/send — der Aufrufer unterscheidet nicht zwischen beidem.
export const sendVehicleReport = async (body: FormData): Promise<boolean> => {
	try {
		const response = await fetch('/api/send', { method: 'POST', body });
		return response.ok;
	} catch {
		return false;
	}
};
