import type { AddressSuggestion } from './autocomplete';

export const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
	try {
		const response = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`);
		if (!response.ok) return [];
		const data = await response.json();
		return Array.isArray(data.suggestions) ? data.suggestions : [];
	} catch {
		return [];
	}
};
