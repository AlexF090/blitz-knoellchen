import type { AddressSuggestion } from './autocomplete';
import { fetchAddressSuggestions } from './autocompleteClient';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export interface AddressSuggestionsController {
	search: (query: string) => void;
	cancel: () => void;
}

// Debounce + Request-Token-Race-Schutz für die Autocomplete-Suche, herausgelöst aus
// AddressAutocomplete.svelte, damit das Timing-Verhalten ohne Component-Rendering testbar ist.
export const createAddressSuggestionsController = (
	onResult: (suggestions: AddressSuggestion[], failed: boolean) => void
): AddressSuggestionsController => {
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let requestToken = 0;

	const cancel = () => {
		clearTimeout(debounceTimer);
		requestToken++;
	};

	const search = (query: string) => {
		clearTimeout(debounceTimer);
		const trimmed = query.trim();
		if (trimmed.length < MIN_QUERY_LENGTH) {
			cancel();
			onResult([], false);
			return;
		}
		debounceTimer = setTimeout(async () => {
			const token = ++requestToken;
			const { suggestions, failed } = await fetchAddressSuggestions(trimmed);
			if (token !== requestToken) return;
			onResult(suggestions, failed);
		}, DEBOUNCE_MS);
	};

	return { search, cancel };
};
