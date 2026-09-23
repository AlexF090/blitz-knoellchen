import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { VEHICLE_MAKES } from '$lib/config/vehicleMakes';
import { VEHICLE_TYPES } from '$lib/config/vehicleTypes';
import { createEmptyVehicle } from '$lib/validation/emptyForm';
import type { VehicleEntry } from '$lib/validation/formSchema';
import VehicleDetailsFieldset from './VehicleDetailsFieldset.svelte';

// Die Fahrzeugfelder sind `bind:value`-gebunden — nur ein reaktives Objekt spiegelt die von der
// Komponente geschriebenen Werte zurück in die Eingabefelder.
const makeVehicle = (id: string, overrides: Partial<VehicleEntry> = {}): VehicleEntry => {
	const vehicle = $state({ ...createEmptyVehicle(id), ...overrides });
	return vehicle;
};

describe('VehicleDetailsFieldset', () => {
	it('schreibt das Kennzeichen beim Tippen groß und erhält die Cursorposition', async () => {
		const vehicle = makeVehicle('v-1');
		await render(VehicleDetailsFieldset, { vehicle });

		const input = document.getElementById('licensePlate-v-1') as HTMLInputElement;
		input.focus();
		input.value = 'k-ab1234';
		input.setSelectionRange(3, 3);
		input.dispatchEvent(new Event('input', { bubbles: true }));

		expect(input.value).toBe('K-AB1234');
		expect(input.selectionStart).toBe(3);
		expect(input.selectionEnd).toBe(3);
		expect(vehicle.licensePlate).toBe('K-AB1234');
	});

	it('normalisiert das Kennzeichen beim Verlassen des Feldes ins kanonische Format', async () => {
		const vehicle = makeVehicle('v-2', { licensePlate: 'K AB 1234' });
		await render(VehicleDetailsFieldset, { vehicle });

		const input = document.getElementById('licensePlate-v-2') as HTMLInputElement;
		input.focus();
		input.blur();

		await expect.poll(() => vehicle.licensePlate).toBe('K-AB1234');
	});

	it('bietet alle Fahrzeugarten aus VEHICLE_TYPES zur Auswahl an', async () => {
		const vehicle = makeVehicle('v-3');
		await render(VehicleDetailsFieldset, { vehicle });

		const select = document.getElementById('vehicleType-v-3') as HTMLSelectElement;
		const values = Array.from(select.options).map((option) => option.value);
		expect(values).toEqual(['', ...VEHICLE_TYPES]);

		await userEvent.selectOptions(select, 'Motorrad');
		expect(vehicle.vehicleType).toBe('Motorrad');
	});

	it('bietet alle Marken aus VEHICLE_MAKES als Datalist-Vorschläge an', async () => {
		await render(VehicleDetailsFieldset, { vehicle: makeVehicle('v-4') });

		const datalist = document.getElementById('vehicle-makes-v-4') as HTMLDataListElement;
		const values = Array.from(datalist.options).map((option) => option.value);
		expect(values).toEqual([...VEHICLE_MAKES]);
	});

	it('übernimmt Länderkennzeichen, Marke und Farbe in das Fahrzeug', async () => {
		const vehicle = makeVehicle('v-5');
		await render(VehicleDetailsFieldset, { vehicle });

		await userEvent.fill(page.getByLabelText('Länderkennz.'), 'NL');
		await userEvent.fill(page.getByLabelText('Marke'), 'VW');
		await userEvent.fill(page.getByLabelText('Farbe'), 'Rot');

		expect(vehicle).toMatchObject({ licensePlateCountry: 'NL', make: 'VW', color: 'Rot' });
	});

	it('zeigt Feldfehler aus dem errors-Prop an', async () => {
		await render(VehicleDetailsFieldset, {
			vehicle: makeVehicle('v-6'),
			errors: {
				licensePlate: 'Bitte Kennzeichen angeben.',
				vehicleType: 'Bitte Fahrzeugart auswählen.',
				make: 'Bitte Marke angeben.',
				color: 'Bitte Farbe angeben.'
			}
		});

		await expect.element(page.getByText('Bitte Kennzeichen angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Fahrzeugart auswählen.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Marke angeben.')).toBeInTheDocument();
		await expect.element(page.getByText('Bitte Farbe angeben.')).toBeInTheDocument();
	});
});
