import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { fetchAddressSuggestions } from '$lib/geocode/autocompleteClient';
import { createEmptyVehicle } from '$lib/validation/emptyForm';
import type { VehicleEntry } from '$lib/validation/formSchema';
import IncidentLocationFieldset from './IncidentLocationFieldset.svelte';

// Das Straßenfeld ist ein AddressAutocomplete — echte Netzwerkaufrufe beim Tippen sind hier
// nicht Testgegenstand, daher wird der Client konsequent gemockt.
vi.mock('$lib/geocode/autocompleteClient', () => ({
	fetchAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [], failed: false })
}));

const mockedFetchAddressSuggestions = vi.mocked(fetchAddressSuggestions);

// Die Tatort-Felder sind `bind:value`-gebunden — nur ein reaktives Objekt spiegelt die von der
// Komponente geschriebenen Werte zurück in die Eingabefelder.
const makeVehicle = (id: string, overrides: Partial<VehicleEntry> = {}): VehicleEntry => {
	const vehicle = $state({ ...createEmptyVehicle(id), ...overrides });
	return vehicle;
};

const halteverstossOption = () =>
	page.getByRole('radio', { name: 'Halteverstoß (Einzelzeitpunkt)' });
const parkverstossOption = () =>
	page.getByRole('radio', { name: 'Parkverstoß (Zeitraum, mind. 4 Min.)' });

describe('IncidentLocationFieldset', () => {
	it('zeigt bei Halteverstoß nur einen Zeitpunkt und keinen Mindestparkzeit-Hinweis', async () => {
		await render(IncidentLocationFieldset, { vehicle: makeVehicle('v-1') });

		await expect.element(halteverstossOption()).toBeChecked();
		await expect.element(page.getByLabelText('Uhrzeit')).toBeInTheDocument();
		await expect.element(page.getByLabelText('Bis')).not.toBeInTheDocument();
		await expect
			.element(page.getByText(/mindestens 4 Minuten durchgängig/i))
			.not.toBeInTheDocument();
	});

	it('zeigt bei Parkverstoß das Bis-Feld und den Mindestparkzeit-Hinweis', async () => {
		const vehicle = makeVehicle('v-2');
		await render(IncidentLocationFieldset, { vehicle });

		await userEvent.click(parkverstossOption());

		expect(vehicle.timeMode).toBe('parkverstoss');
		await expect.element(page.getByText(/mindestens 4 Minuten durchgängig/i)).toBeInTheDocument();
		await expect.element(page.getByLabelText('Von')).toBeInTheDocument();

		await userEvent.fill(page.getByLabelText('Bis'), '10:45');
		expect(vehicle.endTime).toBe('10:45');
	});

	it('leert endTime beim Wechsel zurück auf Halteverstoß', async () => {
		const vehicle = makeVehicle('v-3', { timeMode: 'parkverstoss', endTime: '10:45' });
		await render(IncidentLocationFieldset, { vehicle });

		await userEvent.click(halteverstossOption());

		expect(vehicle.timeMode).toBe('halteverstoss');
		expect(vehicle.endTime).toBe('');
		await expect.element(page.getByLabelText('Bis')).not.toBeInTheDocument();
	});

	it('übernimmt Datum, Uhrzeit und Adressfelder in das Fahrzeug', async () => {
		const vehicle = makeVehicle('v-4');
		await render(IncidentLocationFieldset, { vehicle });

		await userEvent.fill(page.getByLabelText('Datum'), '2024-01-05');
		await userEvent.fill(page.getByLabelText('Uhrzeit'), '10:00');
		await userEvent.fill(page.getByLabelText('Straße'), 'Domkloster');
		await userEvent.fill(page.getByLabelText('Hausnr.'), '4');
		await userEvent.fill(page.getByLabelText('PLZ'), '50667');
		await userEvent.fill(page.getByLabelText('Ort'), 'Köln');

		expect(vehicle).toMatchObject({
			date: '2024-01-05',
			time: '10:00',
			locationStreet: 'Domkloster',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Köln'
		});
	});

	it('übernimmt eine per Autocomplete ausgewählte Adresse in die Tatort-Felder', async () => {
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
		const vehicle = makeVehicle('v-5');
		await render(IncidentLocationFieldset, { vehicle });

		await userEvent.fill(page.getByRole('combobox', { name: 'Straße' }), 'Domklo');
		await userEvent.click(page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' }));

		expect(vehicle).toMatchObject({
			locationStreet: 'Domkloster',
			locationHouseNumber: '4',
			locationPostcode: '50667',
			locationCity: 'Köln'
		});
	});

	it('rendert geocodeWarning als Status-Meldung', async () => {
		await render(IncidentLocationFieldset, {
			vehicle: makeVehicle('v-6'),
			geocodeWarning: 'Adresse konnte nicht ermittelt werden.'
		});

		await expect
			.element(page.getByRole('status'))
			.toHaveTextContent('Adresse konnte nicht ermittelt werden.');
	});

	it('zeigt Feldfehler aus dem errors-Prop an', async () => {
		const vehicle = makeVehicle('v-7', { timeMode: 'parkverstoss' });
		await render(IncidentLocationFieldset, {
			vehicle,
			errors: {
				date: 'Bitte Datum angeben.',
				time: 'Bitte Uhrzeit angeben.',
				endTime: 'Bitte Endzeit angeben.',
				locationStreet: 'Bitte Straße angeben.',
				locationPostcode: 'Bitte PLZ angeben.',
				locationCity: 'Bitte Ort angeben.'
			}
		});

		await expect.element(page.getByText('Bitte Datum angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Uhrzeit angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Endzeit angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Straße angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte PLZ angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Ort angeben.')).toBeInTheDocument();
	});
});
