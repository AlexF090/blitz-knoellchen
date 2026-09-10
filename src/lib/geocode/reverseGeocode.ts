export interface ReverseGeocodeResult {
	address: string | null;
	error: string | null;
}

export interface GeocodeProvider {
	name: string;
	lookup: (lat: number, lon: number) => Promise<string | null>;
}

export function createNominatimProvider(userAgent: string, fetchFn: typeof fetch): GeocodeProvider {
	return {
		name: 'nominatim',
		async lookup(lat, lon) {
			const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
			const response = await fetchFn(url, { headers: { 'User-Agent': userAgent } });
			if (!response.ok) throw new Error(`Nominatim antwortete mit ${response.status}`);
			const data = await response.json();
			return data?.display_name ?? null;
		}
	};
}

export function createBigDataCloudProvider(fetchFn: typeof fetch): GeocodeProvider {
	return {
		name: 'bigdatacloud',
		async lookup(lat, lon) {
			const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=de`;
			const response = await fetchFn(url);
			if (!response.ok) throw new Error(`BigDataCloud antwortete mit ${response.status}`);
			const data = await response.json();
			const parts = [data?.locality, data?.city, data?.postcode, data?.countryName].filter(Boolean);
			return parts.length > 0 ? parts.join(', ') : null;
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
		} catch {
			// nächsten Provider in der Kette versuchen
		}
	}
	return {
		address: null,
		error: 'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.'
	};
}
