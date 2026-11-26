import { describeHttpError } from './httpErrors';

/** Ein Adressvorschlag: `label` für die Anzeige, die übrigen Felder zum Befüllen des Formulars. */
export interface AddressSuggestion {
	label: string;
	street: string | null;
	houseNumber: string | null;
	postcode: string | null;
	city: string | null;
}

const REQUEST_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 3;

/** Die Felder eines Geoapify-Treffers, die die App nutzt. */
interface GeoapifyResult {
	formatted?: unknown;
	street?: unknown;
	housenumber?: unknown;
	postcode?: unknown;
	city?: unknown;
	suburb?: unknown;
}

const toStringOrNull = (value: unknown): string | null => (value ? String(value) : null);

/** Baut das Anzeige-Label im deutschen Postadressformat „Straße Hausnr., PLZ Stadt-Stadtteil". */
// Geoapifys `formatted` hängt das Land an und enthält bei POIs deren Namen. Ohne Straßenname
// (Treffer ist selbst ein Stadtteil) bleibt nur der Rückfall auf `formatted`.
const buildSuggestionLabel = (item: GeoapifyResult): string => {
	const street = toStringOrNull(item.street);
	if (!street) return String(item.formatted ?? '');

	const houseNumber = toStringOrNull(item.housenumber);
	const postcode = toStringOrNull(item.postcode);
	const city = toStringOrNull(item.city);
	const suburb = toStringOrNull(item.suburb);

	const streetLine = houseNumber ? `${street} ${houseNumber}` : street;
	const cityLine = [postcode, suburb && city ? `${city}-${suburb}` : city]
		.filter(Boolean)
		.join(' ');

	return cityLine ? `${streetLine}, ${cityLine}` : streetLine;
};

// Nur Köln aktiv (s. docs/architektur.md, "Weitere Stadt hinzufügen") — Suche deshalb hart auf
// diese Bounding-Box begrenzt. Format: rect:lon1,lat1,lon2,lat2.
const KOELN_RECTANGLE = 'rect:6.7728,50.8304,7.1620,51.0839';

/** Adress-Autocomplete über Geoapify (EU-Endpunkt), auf das Kölner Stadtgebiet begrenzt. */
export const createGeoapifyAutocompleteProvider = (apiKey: string, fetchFn: typeof fetch) => {
	return {
		async search(query: string): Promise<AddressSuggestion[]> {
			if (query.trim().length < MIN_QUERY_LENGTH) return [];

			const url = `https://api-eu.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&lang=de&format=json&limit=5&filter=${KOELN_RECTANGLE}&apiKey=${apiKey}`;
			const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) throw new Error(describeHttpError('Geoapify', response.status));

			const data = await response.json();
			if (!Array.isArray(data?.results)) return [];

			return data.results.map((item: GeoapifyResult) => ({
				label: buildSuggestionLabel(item),
				street: toStringOrNull(item.street),
				houseNumber: toStringOrNull(item.housenumber),
				postcode: toStringOrNull(item.postcode),
				city: toStringOrNull(item.city)
			}));
		}
	};
};
