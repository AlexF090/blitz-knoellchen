import type { AddressSuggestion } from './autocomplete';

export interface AddressSuggestionsFetchResult {
	suggestions: AddressSuggestion[];
	failed: boolean;
}

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
