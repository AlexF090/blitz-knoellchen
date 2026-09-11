import type { GeocodeAddress } from './geocodeAddress';

export interface ReverseGeocodeResult {
	address: GeocodeAddress | null;
	error: string | null;
}

export interface GeocodeProvider {
	name: string;
	lookup: (lat: number, lon: number) => Promise<GeocodeAddress | null>;
}

const REQUEST_TIMEOUT_MS = 5000;

function describeHttpError(providerName: string, status: number): string {
	if (status === 429) return `${providerName} hat Rate-Limiting gemeldet (HTTP 429)`;
	if (status === 403) return `${providerName} hat die Anfrage blockiert (HTTP 403)`;
	return `${providerName} antwortete mit HTTP ${status}`;
}

// Nichtssagende Ergebnisse (kein Straßenname und keine Ortsangabe) sind nutzlos für die
// Anzeige und werden wie ein "kein Ergebnis" behandelt, damit der nächste Provider versucht wird.
function toAddressOrNull(address: GeocodeAddress): GeocodeAddress | null {
	return address.street || address.city ? address : null;
}

export function createLocationIqProvider(apiKey: string, fetchFn: typeof fetch): GeocodeProvider {
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
}

export function createBigDataCloudProvider(fetchFn: typeof fetch): GeocodeProvider {
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
}

export async function reverseGeocode(
	lat: number,
	lon: number,
	providers: GeocodeProvider[]
): Promise<ReverseGeocodeResult> {
	for (const provider of providers) {
		try {
			const address = await provider.lookup(lat, lon);
			if (address) return { address, error: null };
		} catch (error) {
			// nächsten Provider in der Kette versuchen; Fehler nur server-seitig sichtbar
			// machen (Diagnose), da der Client ohnehin nur "beide fehlgeschlagen" braucht.
			console.error(`[geocode] Provider "${provider.name}" fehlgeschlagen:`, error);
		}
	}
	return {
		address: null,
		error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
	};
}
