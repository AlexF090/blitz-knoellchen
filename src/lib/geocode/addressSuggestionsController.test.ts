import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAddressSuggestionsController } from './addressSuggestionsController';
import * as autocompleteClient from './autocompleteClient';

describe('createAddressSuggestionsController', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('liefert sofort eine leere Liste bei zu kurzer Query, ohne zu fetchen', () => {
		const fetchSpy = vi.spyOn(autocompleteClient, 'fetchAddressSuggestions');
		const onResult = vi.fn();
		const controller = createAddressSuggestionsController(onResult);

		controller.search('Do');

		expect(onResult).toHaveBeenCalledWith([], false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('debounced die Suche und ruft erst nach 300ms fetchAddressSuggestions auf', async () => {
		const suggestions = [
			{
				label: 'Domkloster 4',
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			}
		];
		const fetchSpy = vi
			.spyOn(autocompleteClient, 'fetchAddressSuggestions')
			.mockResolvedValue({ suggestions, failed: false });
		const onResult = vi.fn();
		const controller = createAddressSuggestionsController(onResult);

		controller.search('Domklo');
		expect(fetchSpy).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(fetchSpy).toHaveBeenCalledWith('Domklo');
		expect(onResult).toHaveBeenCalledWith(suggestions, false);
	});

	it('meldet failed:true an onResult weiter, wenn fetchAddressSuggestions fehlschlägt', async () => {
		vi.spyOn(autocompleteClient, 'fetchAddressSuggestions').mockResolvedValue({
			suggestions: [],
			failed: true
		});
		const onResult = vi.fn();
		const controller = createAddressSuggestionsController(onResult);

		controller.search('Domklo');
		await vi.advanceTimersByTimeAsync(300);

		expect(onResult).toHaveBeenCalledWith([], true);
	});

	it('verwirft eine veraltete Antwort, wenn zwischenzeitlich eine neuere Suche gestartet wurde', async () => {
		const staleResult = [
			{ label: 'stale', street: null, houseNumber: null, postcode: null, city: null }
		];
		const freshResult = [
			{ label: 'fresh', street: null, houseNumber: null, postcode: null, city: null }
		];
		const fetchSpy = vi.spyOn(autocompleteClient, 'fetchAddressSuggestions');
		let resolveFirst: (value: {
			suggestions: typeof staleResult;
			failed: boolean;
		}) => void = () => {};
		fetchSpy.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
		fetchSpy.mockResolvedValueOnce({ suggestions: freshResult, failed: false });
		const onResult = vi.fn();
		const controller = createAddressSuggestionsController(onResult);

		controller.search('Dom');
		await vi.advanceTimersByTimeAsync(300);

		controller.search('Domkloster');
		await vi.advanceTimersByTimeAsync(300);

		resolveFirst({ suggestions: staleResult, failed: false });
		await Promise.resolve();

		expect(onResult).toHaveBeenCalledWith(freshResult, false);
		expect(onResult).not.toHaveBeenCalledWith(staleResult, false);
	});

	it('cancel() verwirft eine laufende Anfrage', async () => {
		const fetchSpy = vi.spyOn(autocompleteClient, 'fetchAddressSuggestions').mockResolvedValue({
			suggestions: [{ label: 'x', street: null, houseNumber: null, postcode: null, city: null }],
			failed: false
		});
		const onResult = vi.fn();
		const controller = createAddressSuggestionsController(onResult);

		controller.search('Domklo');
		await vi.advanceTimersByTimeAsync(300);
		controller.cancel();
		await Promise.resolve();

		expect(fetchSpy).toHaveBeenCalled();
	});
});
