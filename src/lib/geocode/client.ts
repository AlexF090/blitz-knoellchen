import type { GeocodeAddress } from './geocodeAddress';

/**
 * Ermittelt die Adresse zu einer GPS-Position über den eigenen Geocode-Proxy.
 * Liefert bei jedem Fehler `null` — der Nutzer trägt die Adresse dann manuell ein.
 */
export const fetchAddress = async (lat: number, lon: number): Promise<GeocodeAddress | null> => {
	try {
		const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
		if (!response.ok) {
			console.error('fetchAddress fehlgeschlagen:', response.status, await response.text());
			return null;
		}
		const data = await response.json();
		return data.address ?? null;
	} catch (error) {
		console.error('fetchAddress fehlgeschlagen:', error);
		return null;
	}
};
