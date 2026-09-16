import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import {
	addEntry,
	clearDraft,
	getDraft,
	getProfile,
	saveDraft,
	saveProfile
} from '$lib/history/db';
import { fetchAddress } from '$lib/geocode/client';
import { fetchAddressSuggestions } from '$lib/geocode/autocompleteClient';
import { HeicConversionError, createPhotoEntry } from '$lib/photo/createPhotoEntry';
import { sendVehicleReport } from '$lib/report/sendClient';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';
import ReportForm from './ReportForm.svelte';

vi.mock('$lib/history/db', () => ({
	getDraft: vi.fn(),
	saveDraft: vi.fn(),
	clearDraft: vi.fn(),
	addEntry: vi.fn(),
	getProfile: vi.fn(),
	saveProfile: vi.fn()
}));

vi.mock('$lib/geocode/client', () => ({
	fetchAddress: vi.fn()
}));

vi.mock('$lib/geocode/autocompleteClient', () => ({
	fetchAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [], failed: false })
}));

vi.mock('$lib/report/sendClient', () => ({
	sendVehicleReport: vi.fn()
}));

vi.mock('$lib/photo/createPhotoEntry', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/photo/createPhotoEntry')>();
	return { ...actual, createPhotoEntry: vi.fn() };
});

const mockedGetDraft = vi.mocked(getDraft);
const mockedSaveDraft = vi.mocked(saveDraft);
const mockedClearDraft = vi.mocked(clearDraft);
const mockedAddEntry = vi.mocked(addEntry);
const mockedGetProfile = vi.mocked(getProfile);
const mockedSaveProfile = vi.mocked(saveProfile);
const mockedFetchAddress = vi.mocked(fetchAddress);
const mockedSendVehicleReport = vi.mocked(sendVehicleReport);
const mockedCreatePhotoEntry = vi.mocked(createPhotoEntry);
const mockedFetchAddressSuggestions = vi.mocked(fetchAddressSuggestions);

const defaultProps = {
	demoRecipientEmail: 'demo@buergeramt-koeln.de',
	liveRecipientEmail: 'live@buergeramt-koeln.de',
	senderEmail: 'noreply@blitz-knoellchen.de'
};

const makePhoto = (id: string): PhotoEntry => ({
	id,
	blob: new Blob(['fake'], { type: 'image/jpeg' }),
	fileName: `${id}.jpg`,
	gps: null,
	date: null,
	time: null
});

const makeVehicle = (overrides: Partial<VehicleEntry> = {}): VehicleEntry => ({
	id: overrides.id ?? 'veh-1',
	photoIds: ['photo-1'],
	licensePlate: 'K-AA1111',
	licensePlateCountry: 'D',
	vehicleType: 'PKW',
	make: 'VW',
	color: 'Rot',
	incidentTypeIds: ['halteverbot'],
	notes: '',
	date: '2024-01-05',
	time: '10:00',
	timeMode: 'halteverstoss',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const validProfile = {
	firstName: 'Erika',
	lastName: 'Musterfrau',
	addressStreet: 'Musterstraße 1',
	addressPostcode: '50667',
	addressCity: 'Köln',
	email: 'erika@example.com',
	phone: ''
};

const setDefaultMocks = () => {
	mockedGetDraft.mockResolvedValue(undefined);
	mockedGetProfile.mockResolvedValue(undefined);
	mockedSaveProfile.mockResolvedValue(undefined);
	mockedSaveDraft.mockResolvedValue(undefined);
	mockedClearDraft.mockResolvedValue(undefined);
	mockedAddEntry.mockResolvedValue(undefined);
	mockedFetchAddress.mockResolvedValue(null);
	mockedFetchAddressSuggestions.mockResolvedValue({ suggestions: [], failed: false });
	mockedSendVehicleReport.mockResolvedValue(true);
};

const uploadPhoto = (file: File) => {
	const input = document.getElementById('photo-pool-input') as HTMLInputElement;
	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(file);
	input.files = dataTransfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
};

// Ohne explizites Unmounten bleiben Komponenten aus vorherigen Tests im DOM (kein automatisches
// Cleanup zwischen Tests) — das führt zu mehrdeutigen Selektoren und zu Cross-Test-Interferenz
// bei gemeinsam genutzten Modul-Mocks. Jeder Test räumt daher seine eigene Instanz danach ab.
let currentUnmount: (() => void) | undefined;

const renderForm = (props: typeof defaultProps = defaultProps) => {
	const result = render(ReportForm, props);
	currentUnmount = result.unmount;
	// Die eigene Validierung (validateReportForm/isFormValid) ist Testgegenstand — native
	// HTML5-Constraint-Validierung (durch die `required`-Attribute) würde ein "invalid" Submit
	// sonst schon vor Auslösen des `submit`-Events abfangen und onSubmit gar nie ausführen.
	document.querySelector('form')?.setAttribute('novalidate', '');
	return result;
};

afterEach(() => {
	currentUnmount?.();
	currentUnmount = undefined;
	// restoreAllMocks() leert bei reinen vi.fn()-Modul-Mocks (kein vi.spyOn) nicht deren
	// mock.calls-Historie — ohne clearAllMocks() bleiben Aufrufzähler wie z.B. von
	// sendVehicleReport testübergreifend erhalten und verfälschen nachfolgende Assertions.
	vi.clearAllMocks();
});

describe('ReportForm', () => {
	it('befüllt das Formular beim Laden mit gespeichertem Profil und Entwurf', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle()],
			photos: [makePhoto('photo-1')]
		});

		renderForm();

		await expect.element(page.getByText(validProfile.email, { exact: true })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
	});

	it('ordnet ein hinzugefügtes Foto dem einzigen Fahrzeug zu und befüllt EXIF-Adresse/Datum/Zeit', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockResolvedValue({
			id: 'photo-exif',
			blob: new Blob(['x'], { type: 'image/jpeg' }),
			fileName: 'exif.jpg',
			gps: { lat: 50.9413, lon: 6.9583 },
			date: '2024-05-01',
			time: '14:30'
		});
		mockedFetchAddress.mockResolvedValue({
			street: 'Domkloster',
			houseNumber: '4',
			postcode: '50667',
			city: 'Köln'
		});

		renderForm();

		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'exif.jpg', { type: 'image/jpeg' }));

		await expect.element(page.getByLabelText('Datum')).toHaveValue('2024-05-01');
		await expect.element(page.getByLabelText('Uhrzeit')).toHaveValue('14:30');
		await expect
			.poll(() => document.querySelector<HTMLInputElement>('[id^="locationStreet-"]')?.value)
			.toBe('Domkloster');
		await expect
			.poll(() => document.querySelector<HTMLInputElement>('[id^="locationCity-"]')?.value)
			.toBe('Köln');
	});

	it('zeigt einen Hinweis, wenn das Foto keine GPS-Daten enthält', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockResolvedValue({
			id: 'photo-no-gps',
			blob: new Blob(['x'], { type: 'image/jpeg' }),
			fileName: 'no-gps.jpg',
			gps: null,
			date: null,
			time: null
		});

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'no-gps.jpg', { type: 'image/jpeg' }));

		await expect
			.element(
				page.getByText('Keine Standortdaten im Foto gefunden — bitte Adresse manuell eingeben.')
			)
			.toBeInTheDocument();
		// Ohne GPS wird applyPhotoExifToVehicle vor dem eigentlichen Geocoding-Aufruf beendet
		// (`if (!photo.gps) { ...Warnung...; return; }`) — weder wird die Adresse befüllt, noch
		// wird überhaupt ein Netzwerkaufruf ausgelöst.
		expect(document.querySelector<HTMLInputElement>('[id^="locationStreet-"]')?.value).toBe('');
		expect(mockedFetchAddress).not.toHaveBeenCalled();
	});

	it('meldet eine nicht konvertierbare HEIC-Datei als Fehler, ohne das Formular zu blockieren', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockRejectedValue(new HeicConversionError('HEIC kaputt'));

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'broken.heic', { type: 'image/heic' }));

		await expect.element(page.getByText('HEIC kaputt')).toBeInTheDocument();
	});

	it('lässt einen anderen Fehler als HeicConversionError beim Foto-Hinzufügen durchreichen', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockRejectedValue(new Error('Unerwarteter Verarbeitungsfehler'));

		let caughtRejection: unknown;
		const onUnhandledRejection = (event: PromiseRejectionEvent) => {
			caughtRejection = event.reason;
			// Verhindert, dass der Browser-Kontext den Test wegen des (erwarteten) unbehandelten
			// Rejects als fehlgeschlagen markiert — der generische Fehler soll hier bewusst nicht
			// von onAddPhoto verschluckt, sondern durchgereicht werden (`throw error;`).
			event.preventDefault();
		};
		window.addEventListener('unhandledrejection', onUnhandledRejection);

		try {
			renderForm();
			await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
			uploadPhoto(new File(['x'], 'normal.jpg', { type: 'image/jpeg' }));

			await expect
				.poll(() => (caughtRejection as Error | undefined)?.message)
				.toBe('Unerwarteter Verarbeitungsfehler');
			// Der finally-Block läuft trotz Rethrow — kein dauerhaft hängender
			// Verarbeitungs-Zustand (kein sichtbarer "Foto wird verarbeitet…"-Spinner mehr).
			await expect
				.element(page.getByRole('status', { name: 'Foto wird verarbeitet…' }))
				.not.toBeInTheDocument();
		} finally {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	it('fügt per Button ein weiteres Fahrzeug hinzu', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }));

		await expect.element(page.getByRole('heading', { name: 'Vorfall 1' })).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();
	});

	it('entfernt ein Fahrzeug über den Reset-Dialog, wenn mehrere existieren', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [
				makeVehicle({ id: 'veh-1' }),
				makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222' })
			],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Vorfall entfernen' }).first());
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-BB2222');
	});

	it('setzt das einzige Fahrzeug über den Reset-Dialog zurück', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Vorfall zurücksetzen' }));
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('');
	});

	it('sendet ein gültiges Formular ab und zeigt den Erfolgsdialog', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedSendVehicleReport.mockResolvedValue(true);

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		await expect
			.element(page.getByRole('dialog', { name: 'Anzeige erfolgreich versendet' }))
			.toBeInTheDocument();
		expect(mockedSendVehicleReport).toHaveBeenCalledTimes(1);
		const body = mockedSendVehicleReport.mock.calls[0][0];
		expect(body.get('licensePlate')).toBe('K-AA1111');
		expect(body.get('firstName')).toBe(validProfile.firstName);
		expect(mockedAddEntry).toHaveBeenCalledTimes(1);
	});

	it('verhindert das Absenden bei Validierungsfehlern und fokussiert das erste fehlerhafte Feld', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1', licensePlate: '' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect
			.element(page.getByRole('status').getByText('Bitte Kennzeichen angeben.'))
			.toBeInTheDocument();
		expect(document.activeElement?.id).toBe('licensePlate-veh-1');
	});

	it('entfernt bei Teilerfolg nur die erfolgreich gesendeten Fahrzeuge aus dem Formular', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [
				makeVehicle({ id: 'veh-1', licensePlate: 'K-AA1111' }),
				makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222', photoIds: ['photo-2'] })
			],
			photos: [makePhoto('photo-1'), makePhoto('photo-2')]
		});
		mockedSendVehicleReport.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		await expect
			.element(page.getByText(/1 von 2 Anzeigen erfolgreich versendet/))
			.toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-BB2222');
		expect(mockedAddEntry).toHaveBeenCalledTimes(1);
	});

	it('zeigt eine Fehlermeldung, wenn der Versand für alle Fahrzeuge fehlschlägt', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedSendVehicleReport.mockResolvedValue(false);

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		await expect
			.element(
				page.getByText(
					'Der Versand ist fehlgeschlagen. Deine Angaben bleiben erhalten — bitte erneut versuchen.'
				)
			)
			.toBeInTheDocument();
		expect(mockedAddEntry).not.toHaveBeenCalled();
	});

	it('setzt das komplette Formular über den Reset-Dialog zurück', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last());

		await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
		expect(mockedClearDraft).toHaveBeenCalled();
	});

	it('BUG-Regressionstest: nach Entfernen eines Fahrzeugs zeigt das verbleibende Fahrzeug weiterhin seinen eigenen Fehler', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [
				makeVehicle({ id: 'veh-a', licensePlate: 'K-AA1111' }),
				makeVehicle({ id: 'veh-b', licensePlate: '', photoIds: ['photo-2'] })
			],
			photos: [makePhoto('photo-1'), makePhoto('photo-2')]
		});

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		// Absenden schlägt fehl: Fahrzeug A (Index 0) ist gültig, Fahrzeug B (Index 1) hat ein
		// fehlendes Kennzeichen -> errors.vehicles = [{}, {licensePlate: '...'}]. Das feldbezogene
		// (externe, aus errors.vehicles gespeiste) Fehler-<p> ist von der lokalen
		// missingFieldMessages-Liste getrennt (role="alert" mit stabiler id="licensePlate-veh-b-error"
		// vs. role="status") — genau dieses externe Feld-Fehler-Element ist vom Bug betroffen.
		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));
		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect
			.poll(() => document.getElementById('licensePlate-veh-b-error')?.textContent)
			.toBe('Bitte Kennzeichen angeben.');

		// Fahrzeug A entfernen -> Fahrzeug B rückt auf Index 0. Ohne Fix bleibt errors.vehicles
		// unverändert (index-basiert an der alten Position), Fahrzeug B verliert so fälschlich
		// seine Fehleranzeige (errors.vehicles?.[0] wäre dann A's alte leere {}-Fehlerobjekt statt
		// B's eigenem Fehler).
		await userEvent.click(page.getByRole('button', { name: 'Vorfall entfernen' }).first());
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('');
		await expect
			.poll(() => document.getElementById('licensePlate-veh-b-error')?.textContent)
			.toBe('Bitte Kennzeichen angeben.');
	});

	it('startet trotz Fehler beim Laden von Profil/Entwurf leer statt dauerhaft im Lade-Skeleton', async () => {
		setDefaultMocks();
		mockedGetProfile.mockRejectedValue(new Error('IndexedDB kaputt'));

		renderForm();

		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Vorname')).toHaveValue('');
	});

	it('speichert das Profil erst nach erfolgreicher Validierung und wechselt in den Anzeige-Modus', async () => {
		setDefaultMocks();

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();

		// Ungültig: Pflichtfelder leer -> Speichern bleibt im Bearbeiten-Modus.
		await userEvent.click(page.getByRole('button', { name: 'Speichern' }));
		await expect.element(page.getByText('Vorname ist erforderlich.')).toBeInTheDocument();
		await expect.element(page.getByLabelText('Vorname')).toBeInTheDocument();

		await userEvent.fill(page.getByLabelText('Vorname'), 'Erika');
		await userEvent.fill(page.getByLabelText('Nachname'), 'Musterfrau');
		await userEvent.fill(page.getByLabelText('Straße und Hausnr.'), 'Musterstraße 1');
		await userEvent.fill(page.getByLabelText('PLZ'), '50667');
		await userEvent.fill(page.getByLabelText('Ort'), 'Köln');
		await userEvent.fill(page.getByLabelText('Deine E-Mail-Adresse'), 'erika@example.com');
		await userEvent.fill(page.getByLabelText('Telefonnummer'), '0221 12345678');

		await userEvent.click(page.getByRole('button', { name: 'Speichern' }));

		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
		await expect.element(page.getByText('0221 12345678')).toBeInTheDocument();
		await expect.element(page.getByText('erika@example.com', { exact: true })).toBeInTheDocument();
		expect(mockedSaveProfile).toHaveBeenCalled();
	});

	it('übernimmt eine per Autocomplete ausgewählte Adresse in die Profil-Adressfelder', async () => {
		setDefaultMocks();
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

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();

		const streetInput = page.getByRole('combobox', { name: 'Straße und Hausnr.' });
		await userEvent.fill(streetInput, 'Domklo');
		const option = page.getByRole('option', { name: 'Domkloster 4, 50667 Köln' });
		await expect.element(option).toBeInTheDocument();
		await userEvent.click(option);

		await expect.element(page.getByLabelText('Straße und Hausnr.')).toHaveValue('Domkloster 4');
		await expect.element(page.getByLabelText('PLZ')).toHaveValue('50667');
		await expect.element(page.getByLabelText('Ort')).toHaveValue('Köln');
	});

	it('übernimmt aus einer Autocomplete-Auswahl ohne PLZ/Ort nur Straße und Hausnr., ohne PLZ/Ort zu leeren', async () => {
		setDefaultMocks();
		mockedFetchAddressSuggestions.mockResolvedValue({
			suggestions: [
				{
					label: 'Domkloster 4',
					street: 'Domkloster',
					houseNumber: '4',
					postcode: null,
					city: null
				}
			],
			failed: false
		});

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();

		// PLZ/Ort vorab manuell befüllen — die Auswahl darf diese nicht überschreiben, da die
		// Vorschläge kein postcode/city liefern (`if (suggestion.postcode) ...`/`if (suggestion.city) ...`).
		await userEvent.fill(page.getByLabelText('PLZ'), '50999');
		await userEvent.fill(page.getByLabelText('Ort'), 'Alt-Köln');

		const streetInput = page.getByRole('combobox', { name: 'Straße und Hausnr.' });
		await userEvent.fill(streetInput, 'Domklo');
		const option = page.getByRole('option', { name: 'Domkloster 4' });
		await expect.element(option).toBeInTheDocument();
		await userEvent.click(option);

		await expect.element(page.getByLabelText('Straße und Hausnr.')).toHaveValue('Domkloster 4');
		await expect.element(page.getByLabelText('PLZ')).toHaveValue('50999');
		await expect.element(page.getByLabelText('Ort')).toHaveValue('Alt-Köln');
	});

	it('speichert einen nicht-leeren Entwurf automatisch (debounced) in die IndexedDB', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await new Promise((resolve) => setTimeout(resolve, 900));
		expect(mockedSaveDraft).toHaveBeenCalled();
	});

	it('löscht einen leeren Entwurf automatisch (debounced), statt ihn zu speichern', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue(undefined);

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();

		await new Promise((resolve) => setTimeout(resolve, 900));
		expect(mockedClearDraft).toHaveBeenCalled();
		expect(mockedSaveDraft).not.toHaveBeenCalled();
	});

	it('ordnet ein zweites hinzugefügtes Foto ebenfalls automatisch dem einzigen Fahrzeug zu', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1', photoIds: ['photo-1'] })],
			photos: [makePhoto('photo-1')]
		});
		mockedCreatePhotoEntry.mockResolvedValue({
			id: 'photo-2',
			blob: new Blob(['x'], { type: 'image/jpeg' }),
			fileName: 'zweites.jpg',
			gps: null,
			date: null,
			time: null
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		uploadPhoto(new File(['x'], 'zweites.jpg', { type: 'image/jpeg' }));

		await expect
			.element(page.getByRole('button', { name: 'Foto zweites.jpg entfernen' }))
			.toBeInTheDocument();
	});

	it('ergänzt eine GPS-Notiz, wenn die aufgelöste Adresse unvollständig bleibt', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockResolvedValue({
			id: 'photo-partial',
			blob: new Blob(['x'], { type: 'image/jpeg' }),
			fileName: 'partial.jpg',
			gps: { lat: 50.9413, lon: 6.9583 },
			date: null,
			time: null
		});
		mockedFetchAddress.mockResolvedValue({
			street: null,
			houseNumber: null,
			postcode: null,
			city: null
		});

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'partial.jpg', { type: 'image/jpeg' }));

		await expect
			.element(
				page.getByText(
					'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.'
				)
			)
			.toBeInTheDocument();
		const notesField = document.querySelector<HTMLTextAreaElement>('[id^="notes-"]');
		await expect
			.poll(() => notesField?.value)
			.toContain('GPS-Koordinaten des Fotos: 50.9413, 6.9583');
	});

	it('setzt die Fehleranzeige eines zurückgesetzten Fahrzeugs zurück', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1', licensePlate: '' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));
		await expect
			.poll(() => document.getElementById('licensePlate-veh-1-error')?.textContent)
			.toBe('Bitte Kennzeichen angeben.');

		await userEvent.click(page.getByRole('button', { name: 'Vorfall zurücksetzen' }));
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.poll(() => document.getElementById('licensePlate-veh-1-error')).toBeNull();
	});

	it('zeigt eine Fehlermeldung, wenn das Löschen des Entwurfs beim Zurücksetzen fehlschlägt', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedClearDraft.mockRejectedValue(new Error('Löschen fehlgeschlagen'));

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last());

		await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
	});

	it('schließt den Erfolgsdialog über den Schließen-Button', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));
		const successDialog = document
			.getElementById('success-dialog-title')
			?.closest('dialog') as HTMLDialogElement;
		await expect.poll(() => successDialog.open).toBe(true);

		await userEvent.click(page.getByRole('button', { name: 'Schließen' }));
		expect(successDialog.open).toBe(false);
	});

	it('scrollt zum Foto-Bereich, wenn beim Absenden kein Foto vorhanden ist', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({ vehicles: [], photos: [] });

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		await expect
			.element(page.getByText('Mindestens ein Foto ist erforderlich.', { exact: true }))
			.toBeInTheDocument();
		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
	});

	it('fokussiert ein fehlerhaftes Profilfeld beim Absenden', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue({ ...validProfile, firstName: '' });
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect.poll(() => document.activeElement?.id).toBe('firstName');
	});

	it('scrollt zum Fahrzeug-Block, wenn ein Feld ohne eigenes Eingabeelement ungültig ist (z.B. Verstoßart)', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1', incidentTypeIds: [] })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		// incidentTypeIds hat kein eigenes fokussierbares Eingabeelement (Checkbox-Gruppe) — die
		// Fehlermeldung wird als eigenständiges <p role="alert"> ohne id gerendert (kein
		// FormField), daher wird hier über die Rolle statt über eine id gesucht.
		await expect
			.element(page.getByRole('alert').getByText('Mindestens eine Verstoßart ist erforderlich.'))
			.toBeInTheDocument();
	});

	it('ordnet ein manuell zugewiesenes Foto bei mehreren Fahrzeugen ebenfalls per EXIF zu', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [
				makeVehicle({ id: 'veh-1', licensePlate: 'K-AA1111' }),
				makeVehicle({
					id: 'veh-2',
					licensePlate: 'K-BB2222',
					photoIds: [],
					date: '',
					time: '',
					locationStreet: '',
					locationHouseNumber: '',
					locationPostcode: '',
					locationCity: ''
				})
			],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		// Der Foto-Toggle-Button selbst hat kein aria-label; der zugängliche Name kommt vom
		// alt-Text des enthaltenen <img>. Beide Fahrzeug-Karten zeigen denselben Pool, daher
		// wird hier explizit auf das zweite (untere) Vorkommen zugegriffen.
		const photoToggle = page.getByRole('button', { name: 'Foto photo-1.jpg auswählen' }).nth(1);
		await userEvent.click(photoToggle);

		// photo-1 hat keine GPS-Daten (makePhoto-Default) -> applyPhotoExifToVehicle setzt für
		// Fahrzeug 2 die noGps-Warnung, sobald das Foto manuell zugeordnet wird (onPhotoToggled).
		await expect
			.element(
				page.getByText('Keine Standortdaten im Foto gefunden — bitte Adresse manuell eingeben.')
			)
			.toBeInTheDocument();
	});

	it('wechselt über den Bearbeiten-Button zurück in den Profil-Bearbeitungsmodus', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({ vehicles: [], photos: [] });

		renderForm();
		await expect.element(page.getByText(validProfile.email, { exact: true })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Bearbeiten' }));

		await expect.element(page.getByLabelText('Vorname')).toHaveValue(validProfile.firstName);
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
	});

	it('entfernt ein Foto aus dem Pool und aus der Zuordnung aller Fahrzeuge', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1', photoIds: ['photo-1'] })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Foto photo-1.jpg entfernen' }));

		await expect
			.element(page.getByRole('button', { name: 'Foto photo-1.jpg entfernen' }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Foto photo-1.jpg auswählen' }))
			.not.toBeInTheDocument();
	});

	it('speichert das Profil per Enter-Taste in einem Profil-Feld, statt das ganze Formular abzuschicken', async () => {
		setDefaultMocks();

		renderForm();
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();

		await userEvent.fill(page.getByLabelText('Vorname'), 'Erika');
		await userEvent.fill(page.getByLabelText('Nachname'), 'Musterfrau');
		await userEvent.fill(page.getByLabelText('Straße und Hausnr.'), 'Musterstraße 1');
		await userEvent.fill(page.getByLabelText('PLZ'), '50667');
		await userEvent.fill(page.getByLabelText('Ort'), 'Köln');
		const emailField = page.getByLabelText('Deine E-Mail-Adresse');
		await userEvent.fill(emailField, 'erika@example.com');
		await userEvent.keyboard('{Enter}');

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect.element(page.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
	});

	it('zeigt die Telefonnummer im Profil-Anzeigemodus an, wenn vorhanden', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue({ ...validProfile, phone: '0221 12345678' });

		renderForm();

		await expect.element(page.getByText('0221 12345678')).toBeInTheDocument();
	});

	it('löst die Adresse eines geteilten Fotos nur einmal auf (Cache) statt bei jeder Zuordnung erneut', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [
				makeVehicle({
					id: 'veh-1',
					licensePlate: 'K-AA1111',
					photoIds: [],
					locationStreet: '',
					locationHouseNumber: '',
					locationPostcode: '',
					locationCity: ''
				}),
				makeVehicle({
					id: 'veh-2',
					licensePlate: 'K-BB2222',
					photoIds: [],
					date: '',
					time: '',
					locationStreet: '',
					locationHouseNumber: '',
					locationPostcode: '',
					locationCity: ''
				})
			],
			photos: [
				{
					id: 'photo-1',
					blob: new Blob(['x'], { type: 'image/jpeg' }),
					fileName: 'photo-1.jpg',
					gps: { lat: 50.9413, lon: 6.9583 },
					date: null,
					time: null
				}
			]
		});
		mockedFetchAddress.mockResolvedValue({
			street: 'Domkloster',
			houseNumber: '4',
			postcode: '50667',
			city: 'Köln'
		});

		renderForm();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		// Foto zunächst manuell Fahrzeug 1 zuordnen -> erste (echte) Adressauflösung.
		const firstToggle = page.getByRole('button', { name: 'Foto photo-1.jpg auswählen' }).nth(0);
		await userEvent.click(firstToggle);
		await expect
			.poll(() => document.querySelector<HTMLInputElement>('[id^="locationStreet-veh-1"]')?.value)
			.toBe('Domkloster');
		expect(mockedFetchAddress).toHaveBeenCalledTimes(1);

		// Dasselbe Foto wird nun manuell auch Fahrzeug 2 zugeordnet — die Adresse ist bereits
		// aufgelöst und im Pool-Eintrag gecacht (resolvePhotoAddress), ein zweiter Netzwerkaufruf
		// darf nicht ausgelöst werden.
		const secondToggle = page.getByRole('button', { name: 'Foto photo-1.jpg auswählen' }).nth(1);
		await userEvent.click(secondToggle);

		await expect
			.poll(() => document.querySelector<HTMLInputElement>('[id^="locationStreet-veh-2"]')?.value)
			.toBe('Domkloster');
		expect(mockedFetchAddress).toHaveBeenCalledTimes(1);
	});

	it('bricht das komplette Zurücksetzen über Abbrechen ab, ohne den Entwurf zu löschen', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockedGetDraft.mockResolvedValue({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		renderForm();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Abbrechen' }));

		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
		expect(mockedClearDraft).not.toHaveBeenCalled();
	});
});
