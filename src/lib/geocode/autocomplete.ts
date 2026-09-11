import { describeHttpError } from './httpErrors';

export interface AddressSuggestion {
	label: string;
	street: string | null;
	houseNumber: string | null;
	postcode: string | null;
	city: string | null;
}

const REQUEST_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 3;

// Die App deckt aktuell nur Köln ab (s. CLAUDE.md, "Weitere Stadt hinzufügen") — die Suche wird
// deshalb hart auf eine Köln-Bounding-Box begrenzt (`bounded=1`), statt eine ungenutzte
// Multi-City-Parametrisierung vorzubereiten. Format laut LocationIQ-Doku: viewbox=left,top,right,bottom
// (min_lon,max_lat,max_lon,min_lat).
const KOELN_VIEWBOX = '6.7728,51.0839,7.1620,50.8304';

export const createLocationIqAutocompleteProvider = (apiKey: string, fetchFn: typeof fetch) => {
	return {
		async search(query: string): Promise<AddressSuggestion[]> {
			if (query.trim().length < MIN_QUERY_LENGTH) return [];

			const url = `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(query)}&format=json&accept-language=de&countrycodes=de&limit=5&normalizecity=1&viewbox=${KOELN_VIEWBOX}&bounded=1`;
			const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) throw new Error(describeHttpError('LocationIQ', response.status));

			const data = await response.json();
			if (!Array.isArray(data)) return [];

			return data.map((item) => ({
				label: String(item?.display_name ?? ''),
				street: item?.address?.road ?? null,
				houseNumber: item?.address?.house_number ?? null,
				postcode: item?.address?.postcode ?? null,
				city: item?.address?.city ?? null
			}));
		}
	};
};
