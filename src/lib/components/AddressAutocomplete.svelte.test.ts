import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { fetchAddressSuggestions } from '$lib/geocode/autocompleteClient';
import type { AddressSuggestion } from '$lib/geocode/autocomplete';
import AddressAutocomplete from './AddressAutocomplete.svelte';

vi.mock('$lib/geocode/autocompleteClient', () => ({
	fetchAddressSuggestions: vi.fn()
}));

const mockedFetchAddressSuggestions = vi.mocked(fetchAddressSuggestions);

const suggestions: AddressSuggestion[] = [
	{
		label: 'Domkloster 4, 50667 Köln',
		street: 'Domkloster',
		houseNumber: '4',
		postcode: '50667',
		city: 'Köln'
	},
	{
		label: 'Domkloster 5, 50667 Köln',
		street: 'Domkloster',
		houseNumber: '5',
		postcode: '50667',
		city: 'Köln'
	}
];

afterEach(() => {
	vi.restoreAllMocks();
});

describe('AddressAutocomplete', () => {
	it('öffnet die Vorschlagsliste nach Eingabe und wartet den Debounce ab', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');

		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();
		await expect.element(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('navigiert mit den Pfeiltasten und aktualisiert aria-activedescendant', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.keyboard('{ArrowDown}');
		await expect.element(input).toHaveAttribute('aria-activedescendant', 'addr-suggestion-0');

		await userEvent.keyboard('{ArrowDown}');
		await expect.element(input).toHaveAttribute('aria-activedescendant', 'addr-suggestion-1');

		await userEvent.keyboard('{ArrowUp}');
		await expect.element(input).toHaveAttribute('aria-activedescendant', 'addr-suggestion-0');
	});

	it('wählt mit Enter den aktiven Vorschlag aus und ruft onSelect korrekt auf', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');

		expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
	});

	it('ignoriert Enter ohne aktiven Vorschlag', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.keyboard('{Enter}');

		expect(onSelect).not.toHaveBeenCalled();
	});

	it('schließt die Liste mit Escape', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.keyboard('{Escape}');

		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.not.toBeInTheDocument();
	});

	it('schließt die Liste bei einem Klick außerhalb und ruft onBlur beim Verlassen per Tab auf', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		const onBlur = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect, onBlur });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.click(document.body);

		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
		expect(onBlur).toHaveBeenCalled();
	});

	it('ignoriert Tastaturnavigation, solange die Liste geschlossen ist', async () => {
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.click(input);
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');

		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('ignoriert andere Tasten, während die Liste geöffnet ist', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		await userEvent.keyboard('a');

		await expect.element(input).toHaveAttribute('aria-expanded', 'true');
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('zeigt eine Fehlermeldung an, wenn das error-Prop gesetzt ist', async () => {
		const onSelect = vi.fn();
		render(AddressAutocomplete, {
			id: 'addr',
			value: '',
			label: 'Adresse',
			onSelect,
			error: 'Adresse ist ungültig'
		});

		await expect.element(page.getByText('Adresse ist ungültig')).toBeInTheDocument();
		await expect
			.element(page.getByRole('combobox', { name: 'Adresse' }))
			.toHaveAttribute('aria-invalid', 'true');
	});

	it('zeigt eine Fehlermeldung, wenn die Adresssuche fehlschlägt', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions: [], failed: true });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');

		await expect
			.element(page.getByText('Adressvorschläge aktuell nicht verfügbar — bitte manuell eingeben.'))
			.toBeInTheDocument();
	});

	it('zeigt keine Fehlermeldung, wenn die Query nur zu kurz ist (keine echten Treffer)', async () => {
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Do');

		await expect
			.element(page.getByText('Adressvorschläge aktuell nicht verfügbar — bitte manuell eingeben.'))
			.not.toBeInTheDocument();
	});

	it('ein Klick innerhalb des Containers (ohne Fokuswechsel) schließt die Liste nicht', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		const { container } = render(AddressAutocomplete, {
			id: 'addr',
			value: '',
			label: 'Adresse',
			onSelect
		});

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		// Direktes dispatchEvent auf das Input-Element (innerhalb von containerElement) statt
		// userEvent.click, damit kein Blur ausgelöst wird — isoliert den onDocumentClick-Handler
		// von handleBlur.
		const rawInput = container.querySelector('input');
		rawInput?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		await expect.element(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('ein Klick außerhalb des Containers (ohne Fokuswechsel) schließt die Liste', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		const { container } = render(AddressAutocomplete, {
			id: 'addr',
			value: '',
			label: 'Adresse',
			onSelect
		});

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		await expect
			.element(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }))
			.toBeInTheDocument();

		const outside = document.createElement('div');
		document.body.appendChild(outside);
		outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		document.body.removeChild(outside);

		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
		expect(container).toBeDefined();
	});

	it('wählt einen Vorschlag per Klick aus und schließt die Liste', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({ suggestions, failed: false });
		const onSelect = vi.fn();
		render(AddressAutocomplete, { id: 'addr', value: '', label: 'Adresse', onSelect });

		const input = page.getByRole('combobox', { name: 'Adresse' });
		await userEvent.fill(input, 'Domklo');
		const option = page.getByRole('option', { name: 'Domkloster 5, 50667 Köln' });
		await expect.element(option).toBeInTheDocument();

		await userEvent.click(option);

		expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
		await expect.element(input).toHaveAttribute('aria-expanded', 'false');
	});
});
