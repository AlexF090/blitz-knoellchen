import { describeHttpError } from './httpErrors';
import type { GeocodeAddress } from './geocodeAddress';

/** Adresse oder — wenn alle Anbieter erfolglos blieben — eine anzeigbare Fehlermeldung. */
export interface ReverseGeocodeResult {
	address: GeocodeAddress | null;
	error: string | null;
}

/** Ein austauschbarer Reverse-Geocoding-Anbieter; `name` dient nur der Fehlerdiagnose im Log. */
export interface GeocodeProvider {
	name: string;
	lookup: (lat: number, lon: number) => Promise<GeocodeAddress | null>;
}

const REQUEST_TIMEOUT_MS = 5000;

/** Verwirft nichtssagende Treffer (weder Straße noch Ort). */
const toAddressOrNull = (address: GeocodeAddress): GeocodeAddress | null => {
	return address.street || address.city ? address : null;
};

/** Reverse-Geocoding über Geoapify, EU-Endpunkt (Verarbeitung in der EU). */
export const createGeoapifyProvider = (apiKey: string, fetchFn: typeof fetch): GeocodeProvider => {
	return {
		name: 'geoapify',
		async lookup(lat, lon) {
			const url = `https://api-eu.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&lang=de&format=json&apiKey=${apiKey}`;
			const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) throw new Error(describeHttpError('Geoapify', response.status));
			const data = await response.json();
			const result = Array.isArray(data?.results) ? data.results[0] : undefined;
			if (!result) return null;
			return toAddressOrNull({
				street: result.street ?? null,
				houseNumber: result.housenumber ?? null,
				postcode: result.postcode ?? null,
				city: result.city ?? null
			});
		}
	};
};

/** Fragt die Anbieter der Reihe nach ab und liefert den ersten brauchbaren Treffer. */
export const reverseGeocode = async (
	lat: number,
	lon: number,
	providers: GeocodeProvider[]
): Promise<ReverseGeocodeResult> => {
	for (const provider of providers) {
		try {
			const address = await provider.lookup(lat, lon);
			if (address) return { address, error: null };
		} catch (error) {
			// Fehler bleiben serverseitig: Der Client braucht nur „fehlgeschlagen“.
			console.error(`[geocode] Provider "${provider.name}" fehlgeschlagen:`, error);
		}
	}
	return {
		address: null,
		error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
	};
};
