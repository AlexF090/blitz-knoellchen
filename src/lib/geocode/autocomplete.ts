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

// Ersetzt LocationIQs `display_name` (Reihenfolge Hausnr./Straße/Stadtteil/Stadt/Bundesland/Land,
// nicht per API-Parameter anpassbar) durch ein an deutsche Postadressen angelehntes Format
// ("Straße Hausnr., PLZ Stadt-Stadtteil"). Fällt auf `display_name` zurück, wenn kein Straßenname
// vorliegt (z.B. Treffer ist selbst ein Stadtteil/POI).
const buildSuggestionLabel = (item: {
	display_name?: unknown;
	address?: {
		road?: unknown;
		house_number?: unknown;
		postcode?: unknown;
		city?: unknown;
		suburb?: unknown;
	};
}): string => {
	const street = item?.address?.road ? String(item.address.road) : null;
	if (!street) return String(item?.display_name ?? '');

	const houseNumber = item?.address?.house_number ? String(item.address.house_number) : null;
	const postcode = item?.address?.postcode ? String(item.address.postcode) : null;
	const city = item?.address?.city ? String(item.address.city) : null;
	const suburb = item?.address?.suburb ? String(item.address.suburb) : null;

	const streetLine = houseNumber ? `${street} ${houseNumber}` : street;
	const cityLine = [postcode, suburb && city ? `${city}-${suburb}` : city]
		.filter(Boolean)
		.join(' ');

	return cityLine ? `${streetLine}, ${cityLine}` : streetLine;
};

// Nur Köln aktiv (s. docs/architektur.md, "Weitere Stadt hinzufügen") — Suche deshalb hart auf
// diese Bounding-Box begrenzt (`bounded=1`). Format: viewbox=left,top,right,bottom.
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
				label: buildSuggestionLabel(item),
				street: item?.address?.road ?? null,
				houseNumber: item?.address?.house_number ?? null,
				postcode: item?.address?.postcode ?? null,
				city: item?.address?.city ?? null
			}));
		}
	};
};
