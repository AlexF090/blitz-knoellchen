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

/** Verwirft nichtssagende Treffer (weder Straße noch Ort), damit der nächste Provider drankommt. */
const toAddressOrNull = (address: GeocodeAddress): GeocodeAddress | null => {
	return address.street || address.city ? address : null;
};

/** Reverse-Geocoding über LocationIQ — liefert als einziger Anbieter Straße und Hausnummer. */
export const createLocationIqProvider = (
	apiKey: string,
	fetchFn: typeof fetch
): GeocodeProvider => {
	return {
		name: 'locationiq',
		async lookup(lat, lon) {
			// accept-language=de für deutsche Ortsnamen; normalizecity=1 stellt sicher, dass
			// `address.city` auch dann befüllt ist, wenn Nominatim/LocationIQ den Ort nur als
			// city_district/town/village etc. taggt (z. B. Kölner Stadtteile).
			const url = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lon}&format=json&accept-language=de&normalizecity=1`;
			const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) throw new Error(describeHttpError('LocationIQ', response.status));
			const data = await response.json();
			return toAddressOrNull({
				street: data?.address?.road ?? null,
				houseNumber: data?.address?.house_number ?? null,
				postcode: data?.address?.postcode ?? null,
				city: data?.address?.city ?? null
			});
		}
	};
};

/** Reverse-Geocoding über BigDataCloud, als Fallback ohne API-Schlüssel. */
export const createBigDataCloudProvider = (fetchFn: typeof fetch): GeocodeProvider => {
	return {
		name: 'bigdatacloud',
		async lookup(lat, lon) {
			const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=de`;
			const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) throw new Error(describeHttpError('BigDataCloud', response.status));
			const data = await response.json();
			// BigDataCloud liefert nur orts-/stadtteilgenaue Treffer, keine Straße/Hausnummer.
			return toAddressOrNull({
				street: null,
				houseNumber: null,
				postcode: data?.postcode ?? null,
				city: data?.city || data?.locality || null
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
			// Fehler bleiben server-seitig: der Client braucht nur „alle fehlgeschlagen" und
			// die Schleife versucht ohnehin den nächsten Provider.
			console.error(`[geocode] Provider "${provider.name}" fehlgeschlagen:`, error);
		}
	}
	return {
		address: null,
		error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
	};
};
