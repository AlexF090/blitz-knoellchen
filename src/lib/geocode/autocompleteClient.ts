import type { AddressSuggestion } from './autocomplete';

/** Vorschlagsliste plus `failed`, um „keine Treffer" von „Abruf fehlgeschlagen" zu unterscheiden. */
export interface AddressSuggestionsFetchResult {
	suggestions: AddressSuggestion[];
	failed: boolean;
}

/**
 * Holt Adressvorschläge über den eigenen Autocomplete-Proxy.
 * Fehler werden zu einem leeren Ergebnis mit `failed: true` — der Aufrufer ist ein Eingabefeld
 * und darf beim Tippen nicht abbrechen.
 */
export const fetchAddressSuggestions = async (
	query: string
): Promise<AddressSuggestionsFetchResult> => {
	try {
		const response = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`);
		if (!response.ok) {
			console.error(
				'fetchAddressSuggestions fehlgeschlagen:',
				response.status,
				await response.text()
			);
			return { suggestions: [], failed: true };
		}
		const data = await response.json();
		return {
			suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
			failed: false
		};
	} catch (error) {
		console.error('fetchAddressSuggestions fehlgeschlagen:', error);
		return { suggestions: [], failed: true };
	}
};
