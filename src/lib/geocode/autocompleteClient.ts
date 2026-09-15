import type { AddressSuggestion } from './autocomplete';

export const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
	try {
		const response = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`);
		if (!response.ok) {
			console.error(
				'fetchAddressSuggestions fehlgeschlagen:',
				response.status,
				await response.text()
			);
			return [];
		}
		const data = await response.json();
		return Array.isArray(data.suggestions) ? data.suggestions : [];
	} catch (error) {
		console.error('fetchAddressSuggestions fehlgeschlagen:', error);
		return [];
	}
};
