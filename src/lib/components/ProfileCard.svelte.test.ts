import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { fetchAddressSuggestions } from '$lib/geocode/autocompleteClient';
import { createEmptyForm } from '$lib/validation/emptyForm';
import type { FormErrors, ReportFormData } from '$lib/validation/formSchema';
import ProfileCard from './ProfileCard.svelte';

// Das Straßenfeld ist ein AddressAutocomplete — echte Netzwerkaufrufe beim Tippen sind hier
// nicht Testgegenstand, daher wird der Client konsequent gemockt.
vi.mock('$lib/geocode/autocompleteClient', () => ({
	fetchAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [], failed: false })
}));

const mockedFetchAddressSuggestions = vi.mocked(fetchAddressSuggestions);

// Die Profilfelder sind `bind:value`-gebunden — nur ein reaktives Objekt spiegelt die von der
// Komponente geschriebenen Werte zurück in die Eingabefelder.
const makeEmptyForm = (): ReportFormData => {
	const form = $state(createEmptyForm());
	return form;
};

const makeFilledForm = (overrides: Partial<ReportFormData> = {}): ReportFormData => {
	const form = $state({
		...createEmptyForm(),
		firstName: 'Erika',
		lastName: 'Musterfrau',
		addressStreet: 'Musterstraße 1',
		addressPostcode: '50667',
		addressCity: 'Köln',
		email: 'erika@example.com',
		phone: '',
		...overrides
	});
	return form;
};

describe('ProfileCard', () => {
	it('zeigt im Lese-Modus Name, Adresse und E-Mail-Adresse an', async () => {
		render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: false,
			onPersist: vi.fn()
		});

		await expect.element(page.getByText('Erika Musterfrau')).toBeInTheDocument();
		await expect.element(page.getByText('Musterstraße 1')).toBeInTheDocument();
		await expect.element(page.getByText('50667 Köln')).toBeInTheDocument();
		await expect.element(page.getByText('erika@example.com')).toBeInTheDocument();
	});

	it('zeigt die optionale Telefonnummer im Lese-Modus nur, wenn sie gesetzt ist', async () => {
		const withoutPhone = render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: false,
			onPersist: vi.fn()
		});

		await expect.element(page.getByText('0221 12345678')).not.toBeInTheDocument();
		withoutPhone.unmount();

		render(ProfileCard, {
			form: makeFilledForm({ phone: '0221 12345678' }),
			errors: {} as FormErrors,
			isEditing: false,
			onPersist: vi.fn()
		});

		await expect.element(page.getByText('0221 12345678')).toBeInTheDocument();
	});

	it('übernimmt nachträglich geänderte Profildaten in die Lese-Ansicht', async () => {
		const form = makeFilledForm();
		render(ProfileCard, {
			form,
			errors: {} as FormErrors,
			isEditing: false,
			onPersist: vi.fn()
		});

		form.firstName = 'Max';
		form.addressPostcode = '50733';

		await expect.element(page.getByText('Max Musterfrau')).toBeInTheDocument();
		await expect.element(page.getByText('50733 Köln')).toBeInTheDocument();
	});

	it('schaltet über "Bearbeiten" in den Bearbeiten-Modus', async () => {
		render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: false,
			onPersist: vi.fn()
		});

		await userEvent.click(page.getByRole('button', { name: 'Bearbeiten' }));

		await expect.element(page.getByLabelText('Vorname')).toHaveValue('Erika');
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
	});

	it('setzt Fehler und bleibt im Bearbeiten-Modus, wenn beim Speichern Pflichtfelder fehlen', async () => {
		const errors = $state({} as FormErrors);
		const onPersist = vi.fn();
		render(ProfileCard, {
			form: makeEmptyForm(),
			errors,
			isEditing: true,
			onPersist
		});

		await userEvent.click(page.getByRole('button', { name: 'Speichern' }));

		await expect.element(page.getByText('Vorname ist erforderlich.')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
		expect(onPersist).not.toHaveBeenCalled();
	});

	it('ruft onPersist auf und wechselt in den Lese-Modus, wenn alle Pflichtfelder ausgefüllt sind', async () => {
		const form = makeEmptyForm();
		const onPersist = vi.fn().mockResolvedValue(undefined);
		render(ProfileCard, {
			form,
			errors: {} as FormErrors,
			isEditing: true,
			onPersist
		});

		await userEvent.fill(page.getByLabelText('Vorname'), 'Erika');
		await userEvent.fill(page.getByLabelText('Nachname'), 'Musterfrau');
		await userEvent.fill(page.getByLabelText('Straße und Hausnr.'), 'Musterstraße 1');
		await userEvent.fill(page.getByLabelText('PLZ'), '50667');
		await userEvent.fill(page.getByLabelText('Ort'), 'Köln');
		await userEvent.fill(page.getByLabelText('Deine E-Mail-Adresse'), 'erika@example.com');
		await userEvent.fill(page.getByLabelText('Telefonnummer'), '0221 12345678');

		await userEvent.click(page.getByRole('button', { name: 'Speichern' }));

		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
		expect(onPersist).toHaveBeenCalled();
		expect(form).toMatchObject({
			firstName: 'Erika',
			lastName: 'Musterfrau',
			addressStreet: 'Musterstraße 1',
			addressPostcode: '50667',
			addressCity: 'Köln',
			email: 'erika@example.com',
			phone: '0221 12345678'
		});
	});

	it('ruft onPersist beim Verlassen eines Feldes auf', async () => {
		const onPersist = vi.fn().mockResolvedValue(undefined);
		render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: true,
			onPersist
		});

		const input = document.getElementById('firstName') as HTMLInputElement;
		input.focus();
		input.blur();

		await expect.poll(() => onPersist).toHaveBeenCalled();
	});

	it('speichert das Profil per Enter-Taste, statt das umgebende Formular abzuschicken', async () => {
		const onPersist = vi.fn().mockResolvedValue(undefined);
		render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: true,
			onPersist
		});

		const input = document.getElementById('firstName') as HTMLInputElement;
		const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
		input.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		await expect.poll(() => onPersist).toHaveBeenCalled();
		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
	});

	it('übernimmt eine per Autocomplete ausgewählte Adresse in Straße, PLZ und Ort', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({
			suggestions: [
				{
					label: 'Domkloster 4, 50667 Köln',
					street: 'Domkloster',
					houseNumber: '4',
					postcode: '50667',
					city: 'Köln'
				}
			],
			failed: false
		});
		render(ProfileCard, {
			form: makeEmptyForm(),
			errors: {} as FormErrors,
			isEditing: true,
			onPersist: vi.fn()
		});

		await userEvent.fill(page.getByRole('combobox', { name: 'Straße und Hausnr.' }), 'Domklo');
		await userEvent.click(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }));

		await expect.element(page.getByLabelText('Straße und Hausnr.')).toHaveValue('Domkloster 4');
		await expect.element(page.getByLabelText('PLZ')).toHaveValue('50667');
		await expect.element(page.getByLabelText('Ort')).toHaveValue('Köln');
	});

	it('lässt PLZ und Ort unberührt, wenn der Vorschlag beides nicht liefert', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue({
			suggestions: [
				{
					label: 'Domkloster',
					street: 'Domkloster',
					houseNumber: null,
					postcode: null,
					city: null
				}
			],
			failed: false
		});
		render(ProfileCard, {
			form: makeFilledForm(),
			errors: {} as FormErrors,
			isEditing: true,
			onPersist: vi.fn()
		});

		await userEvent.fill(page.getByRole('combobox', { name: 'Straße und Hausnr.' }), 'Domklo');
		await userEvent.click(page.getByRole('option', { name: 'Domkloster' }));

		await expect.element(page.getByLabelText('Straße und Hausnr.')).toHaveValue('Domkloster');
		await expect.element(page.getByLabelText('PLZ')).toHaveValue('50667');
		await expect.element(page.getByLabelText('Ort')).toHaveValue('Köln');
	});

	it('zeigt Feldfehler aus dem errors-Prop an', async () => {
		render(ProfileCard, {
			form: makeEmptyForm(),
			errors: {
				firstName: 'Vorname ist erforderlich.',
				email: 'E-Mail-Adresse ist ungültig.'
			} as FormErrors,
			isEditing: true,
			onPersist: vi.fn()
		});

		await expect.element(page.getByText('Vorname ist erforderlich.')).toBeInTheDocument();
		await expect.element(page.getByText('E-Mail-Adresse ist ungültig.')).toBeInTheDocument();
	});
});
