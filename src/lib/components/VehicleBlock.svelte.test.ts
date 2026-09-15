import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { CITIES } from '$lib/config/cities';
import {
	buildEmailTemplateInput,
	resolveVehicleIncidentTypes
} from '$lib/email/buildEmailTemplateInput';
import { fetchAddressSuggestions } from '$lib/geocode/autocompleteClient';
import { createEmptyVehicle } from '$lib/validation/emptyForm';
import type { PhotoEntry, ProfileFields, VehicleEntry } from '$lib/validation/formSchema';
import VehicleBlock from './VehicleBlock.svelte';

// AddressAutocomplete wird intern gerendert (Straßenfeld) — echte Netzwerkaufrufe beim Tippen
// sind hier nicht Testgegenstand, daher wird der Client konsequent gemockt.
vi.mock('$lib/geocode/autocompleteClient', () => ({
	fetchAddressSuggestions: vi.fn().mockResolvedValue([])
}));

const mockedFetchAddressSuggestions = vi.mocked(fetchAddressSuggestions);

const city = CITIES.koeln;

const profile: ProfileFields = {
	firstName: 'Erika',
	lastName: 'Musterfrau',
	addressStreet: 'Musterstraße 1',
	addressPostcode: '50667',
	addressCity: 'Köln',
	email: 'erika@example.com',
	phone: ''
};

const makePhoto = (id: string): PhotoEntry => ({
	id,
	blob: new Blob(['fake-image'], { type: 'image/jpeg' }),
	fileName: `${id}.jpg`,
	gps: null,
	date: null,
	time: null
});

const makeCompleteVehicle = (overrides: Partial<VehicleEntry> = {}): VehicleEntry => ({
	...createEmptyVehicle('vehicle-1'),
	photoIds: ['photo-1'],
	licensePlate: 'K-AB1234',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'VW',
	color: 'Rot',
	incidentTypeIds: ['halteverbot'],
	date: '2024-01-05',
	time: '10:00',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const baseProps = () => ({
	index: 0,
	total: 1,
	pool: [makePhoto('photo-1')] as PhotoEntry[],
	incidentTypes: city.incidentTypes,
	maxPhotos: 3,
	profile,
	city,
	recipientEmail: 'buergeramt@koeln.de',
	onRemove: vi.fn(),
	onReset: vi.fn()
});

describe('VehicleBlock', () => {
	it('respektiert das maxPhotos-Limit bei der Foto-Auswahl', async () => {
		const vehicle = $state(createEmptyVehicle('v-photos'));
		const pool = [makePhoto('p1'), makePhoto('p2'), makePhoto('p3')];
		const onPhotoToggled = vi.fn();

		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			pool,
			maxPhotos: 2,
			onPhotoToggled
		});

		const button1 = page.getByRole('button', { name: 'Foto p1.jpg auswählen' });
		const button2 = page.getByRole('button', { name: 'Foto p2.jpg auswählen' });
		const button3 = page.getByRole('button', { name: 'Foto p3.jpg auswählen' });

		await userEvent.click(button1);
		await userEvent.click(button2);
		await expect.element(button1).toHaveAttribute('aria-pressed', 'true');
		await expect.element(button2).toHaveAttribute('aria-pressed', 'true');

		await userEvent.click(button3);
		await expect.element(button3).toHaveAttribute('aria-pressed', 'false');

		expect(onPhotoToggled).toHaveBeenCalledTimes(2);
		expect(onPhotoToggled).toHaveBeenCalledWith('p1', true);
		expect(onPhotoToggled).toHaveBeenCalledWith('p2', true);
		expect(vehicle.photoIds).toEqual(['p1', 'p2']);
	});

	it('entfernt ein bereits ausgewähltes Foto erneut bei Klick', async () => {
		const vehicle = $state(createEmptyVehicle('v-photos-2'));
		const pool = [makePhoto('p1')];
		const onPhotoToggled = vi.fn();

		render(VehicleBlock, { ...baseProps(), vehicle, pool, maxPhotos: 2, onPhotoToggled });

		const button1 = page.getByRole('button', { name: 'Foto p1.jpg auswählen' });
		await userEvent.click(button1);
		await expect.element(button1).toHaveAttribute('aria-pressed', 'true');

		await userEvent.click(button1);
		await expect.element(button1).toHaveAttribute('aria-pressed', 'false');
		expect(onPhotoToggled).toHaveBeenLastCalledWith('p1', false);
		expect(vehicle.photoIds).toEqual([]);
	});

	it('schreibt das Kennzeichen beim Tippen automatisch groß und erhält die Cursorposition', async () => {
		const vehicle = $state(makeCompleteVehicle({ licensePlate: '' }));
		render(VehicleBlock, { ...baseProps(), vehicle });

		const input = document.getElementById('licensePlate-vehicle-1') as HTMLInputElement;
		input.focus();
		input.value = 'k-ab1234';
		input.setSelectionRange(3, 3);
		input.dispatchEvent(new Event('input', { bubbles: true }));

		expect(input.value).toBe('K-AB1234');
		expect(input.selectionStart).toBe(3);
		expect(input.selectionEnd).toBe(3);
		expect(vehicle.licensePlate).toBe('K-AB1234');
	});

	it('normalisiert das Kennzeichen beim Verlassen des Feldes', async () => {
		const vehicle = $state(makeCompleteVehicle({ licensePlate: 'K AB 1234' }));
		render(VehicleBlock, { ...baseProps(), vehicle });

		const input = document.getElementById('licensePlate-vehicle-1') as HTMLInputElement;
		input.focus();
		input.blur();

		expect(vehicle.licensePlate).toBe('K-AB1234');
	});

	it('leert endTime beim Wechsel von Parkverstoß zu Halteverstoß', async () => {
		const vehicle = $state(makeCompleteVehicle({ timeMode: 'parkverstoss', endTime: '10:30' }));
		render(VehicleBlock, { ...baseProps(), vehicle });

		const halteverstossOption = page.getByRole('radio', { name: 'Halteverstoß (Einzelzeitpunkt)' });
		await userEvent.click(halteverstossOption);

		expect(vehicle.timeMode).toBe('halteverstoss');
		expect(vehicle.endTime).toBe('');
	});

	it('zeigt bei Parkverstoß zusätzlich das Bis-Feld und den Mindestparkzeit-Hinweis', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		const parkverstossOption = page.getByRole('radio', {
			name: 'Parkverstoß (Zeitraum, mind. 4 Min.)'
		});
		await userEvent.click(parkverstossOption);

		expect(vehicle.timeMode).toBe('parkverstoss');
		await expect.element(page.getByText(/mindestens 4 Minuten durchgängig/i)).toBeInTheDocument();
		const endTimeField = page.getByLabelText('Bis');
		await expect.element(endTimeField).toBeInTheDocument();

		await userEvent.fill(endTimeField, '10:45');
		expect(vehicle.endTime).toBe('10:45');
	});

	it('zeigt die per buildEmailBody generierte Vorschau bei vollständigen Angaben', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		const previewButton = page.getByRole('button', { name: 'Vorschau' });
		await expect.element(previewButton).not.toBeDisabled();
		await userEvent.click(previewButton);

		const expected = city.buildEmailBody(
			buildEmailTemplateInput({
				profile,
				vehicle,
				incidentTypes: resolveVehicleIncidentTypes(city, vehicle),
				photoCount: vehicle.photoIds.length,
				vehicleIndex: 1,
				vehicleTotal: 1
			})
		);

		await expect.element(page.getByText(expected.subject)).toBeInTheDocument();
		await expect.element(page.getByRole('dialog')).toContainHTML(expected.body.split('\n')[0]);
	});

	it('deaktiviert die Vorschau, solange Pflichtfelder fehlen', async () => {
		const vehicle = $state(createEmptyVehicle('v-incomplete'));
		render(VehicleBlock, { ...baseProps(), vehicle, pool: [] });

		const previewButton = page.getByRole('button', { name: 'Vorschau' });
		await expect.element(previewButton).toBeDisabled();
	});

	it('setzt das Fahrzeug per Reset-Dialog zurück, wenn es das einzige ist', async () => {
		const vehicle = $state(makeCompleteVehicle());
		const onReset = vi.fn();
		render(VehicleBlock, { ...baseProps(), vehicle, total: 1, onReset });

		const resetButton = page.getByRole('button', { name: 'Vorfall zurücksetzen' });
		await userEvent.click(resetButton);

		const confirmButton = page.getByRole('button', { name: 'Entfernen' });
		await userEvent.click(confirmButton);

		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('entfernt das Fahrzeug per Reset-Dialog, wenn weitere Fahrzeuge existieren', async () => {
		const vehicle = $state(makeCompleteVehicle());
		const onRemove = vi.fn();
		render(VehicleBlock, { ...baseProps(), vehicle, total: 2, onRemove });

		const removeButton = page.getByRole('button', { name: 'Vorfall entfernen' });
		await userEvent.click(removeButton);

		const confirmButton = page.getByRole('button', { name: 'Entfernen', exact: true });
		await userEvent.click(confirmButton);

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it('bricht den Reset-Dialog per Abbrechen ohne Callback-Aufruf ab', async () => {
		const vehicle = $state(makeCompleteVehicle());
		const onReset = vi.fn();
		render(VehicleBlock, { ...baseProps(), vehicle, total: 1, onReset });

		await userEvent.click(page.getByRole('button', { name: 'Vorfall zurücksetzen' }));
		await userEvent.click(page.getByRole('button', { name: 'Abbrechen' }));

		expect(onReset).not.toHaveBeenCalled();
	});

	it('klappt bei vollständigen Angaben ein und öffnet sich automatisch wieder, wenn Angaben fehlen', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		const finishButton = page.getByRole('button', { name: 'Fertig' });
		await userEvent.click(finishButton);

		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();

		// Angaben werden nachträglich unvollständig (z.B. Foto extern aus dem Pool entfernt) —
		// die Karte muss automatisch wieder aufklappen statt unvollständige Angaben zu verstecken.
		vehicle.licensePlate = '';

		await expect.element(page.getByRole('button', { name: 'Fertig' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();
	});

	it('zeigt fehlende Pflichtfelder als Hinweisliste, solange die Karte offen und unvollständig ist', async () => {
		const vehicle = $state(createEmptyVehicle('v-missing'));
		render(VehicleBlock, { ...baseProps(), vehicle, pool: [] });

		const status = page.getByRole('status');
		await expect
			.element(status.getByText('Noch nicht einklappbar, bitte prüfen:'))
			.toBeInTheDocument();
		await expect.element(status.getByText('Bitte Kennzeichen angeben.')).toBeInTheDocument();
	});

	it('verhindert das Einklappen per Fertig-Button, solange Angaben fehlen', async () => {
		const vehicle = $state(createEmptyVehicle('v-missing-2'));
		render(VehicleBlock, { ...baseProps(), vehicle, pool: [] });

		const finishButton = page.getByRole('button', { name: 'Fertig' });
		await expect.element(finishButton).toBeDisabled();
	});

	it('zeigt eine Fehlermeldung „Angaben unvollständig“ im eingeklappten Zustand bei vorhandenen errors', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			errors: { licensePlate: 'ungültig' }
		});

		await userEvent.click(page.getByRole('button', { name: 'Fertig' }));

		await expect.element(page.getByText('Angaben unvollständig')).toBeInTheDocument();
	});

	it('zeigt Feldfehler aus dem errors-Prop an', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			errors: { licensePlate: 'Kennzeichen wirkt ungültig.' }
		});

		await expect.element(page.getByText('Kennzeichen wirkt ungültig.')).toBeInTheDocument();
	});

	it('zeigt einen geocodeWarning-Hinweis, wenn gesetzt', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			geocodeWarning: 'Adresse konnte nicht ermittelt werden.'
		});

		await expect
			.element(page.getByText('Adresse konnte nicht ermittelt werden.'))
			.toBeInTheDocument();
	});

	it('zeigt einen Hinweis, wenn der Foto-Pool leer ist', async () => {
		const vehicle = $state(createEmptyVehicle('v-empty-pool'));
		render(VehicleBlock, { ...baseProps(), vehicle, pool: [] });

		await expect.element(page.getByText('Zuerst oben ein Foto hinzufügen.')).toBeInTheDocument();
	});

	it('schaltet Verstoßarten per Checkbox um', async () => {
		const vehicle = $state(makeCompleteVehicle({ incidentTypeIds: [] }));
		render(VehicleBlock, { ...baseProps(), vehicle });

		const checkbox = page.getByRole('checkbox', { name: 'Parken im Halteverbot' });
		await userEvent.click(checkbox);
		expect(vehicle.incidentTypeIds).toContain('halteverbot');

		await userEvent.click(checkbox);
		expect(vehicle.incidentTypeIds).not.toContain('halteverbot');
	});

	it('zeigt den Titel "Vorfall N" bei mehreren Fahrzeugen und "Vorfall" bei einem einzelnen', async () => {
		const vehicle = $state(makeCompleteVehicle());
		const { unmount } = render(VehicleBlock, { ...baseProps(), vehicle, total: 1 });
		await expect.element(page.getByRole('heading', { name: 'Vorfall' })).toBeInTheDocument();
		unmount();

		render(VehicleBlock, { ...baseProps(), vehicle, total: 2, index: 1 });
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();
	});

	it('schließt die Karte per Enter-Taste in einem Feld, sofern vollständig', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		const notesField = document.getElementById(`notes-${vehicle.id}`) as HTMLTextAreaElement;
		notesField.focus();
		await userEvent.keyboard('{Enter}');

		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
	});

	it('lässt die Karte bei Enter-Taste in einem Feld offen, solange Angaben fehlen', async () => {
		const vehicle = $state(createEmptyVehicle('vehicle-incomplete-enter'));
		render(VehicleBlock, { ...baseProps(), vehicle, pool: [] });

		const notesField = document.getElementById(`notes-${vehicle.id}`) as HTMLTextAreaElement;
		notesField.focus();
		await userEvent.keyboard('{Enter}');

		await expect.element(page.getByRole('button', { name: 'Fertig' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();
	});

	it('schließt den Vorschau-Dialog über den Schließen-Button', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		await userEvent.click(page.getByRole('button', { name: 'Vorschau' }));
		const previewDialog = document
			.getElementById('preview-dialog-title-vehicle-1')
			?.closest('dialog') as HTMLDialogElement;
		expect(previewDialog.open).toBe(true);

		await userEvent.click(page.getByRole('button', { name: 'Schließen' }));
		expect(previewDialog.open).toBe(false);
	});

	it('zeigt einen Fehler zur Foto-Auswahl aus dem errors-Prop an', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			errors: { photoIds: 'Bitte mindestens ein Foto für dieses Fahrzeug auswählen.' }
		});

		await expect
			.element(page.getByText('Bitte mindestens ein Foto für dieses Fahrzeug auswählen.'))
			.toBeInTheDocument();
	});

	it('zeigt einen Fehler zur Verstoßart aus dem errors-Prop an', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, {
			...baseProps(),
			vehicle,
			errors: { incidentTypeIds: 'Mindestens eine Verstoßart ist erforderlich.' }
		});

		await expect
			.element(page.getByText('Mindestens eine Verstoßart ist erforderlich.'))
			.toBeInTheDocument();
	});

	it('übernimmt eine per Autocomplete ausgewählte Adresse in die Tatort-Felder', async () => {
		mockedFetchAddressSuggestions.mockResolvedValue([
			{
				label: 'Domkloster 4, 50667 Köln',
				street: 'Domkloster',
				houseNumber: '4',
				postcode: '50667',
				city: 'Köln'
			}
		]);
		const vehicle = $state(
			makeCompleteVehicle({
				locationStreet: '',
				locationHouseNumber: '',
				locationPostcode: '',
				locationCity: ''
			})
		);
		render(VehicleBlock, { ...baseProps(), vehicle });

		const streetInput = page.getByRole('combobox', { name: 'Straße' });
		await userEvent.fill(streetInput, 'Domklo');

		const option = page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' });
		await expect.element(option).toBeInTheDocument();
		await userEvent.click(option);

		expect(vehicle.locationStreet).toBe('Domkloster');
		expect(vehicle.locationHouseNumber).toBe('4');
		expect(vehicle.locationPostcode).toBe('50667');
		expect(vehicle.locationCity).toBe('Köln');
	});

	it('öffnet die Karte über den Bearbeiten-Button wieder', async () => {
		const vehicle = $state(makeCompleteVehicle());
		render(VehicleBlock, { ...baseProps(), vehicle });

		await userEvent.click(page.getByRole('button', { name: 'Fertig' }));
		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Bearbeiten' }));

		await expect.element(page.getByRole('button', { name: 'Fertig' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();
	});
});
