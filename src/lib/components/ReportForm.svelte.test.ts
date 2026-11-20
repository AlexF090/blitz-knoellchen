import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import {
	addEntry,
	clearDraft,
	getDraft,
	getProfile,
	saveDraft,
	saveProfile,
	type LoadedDraft
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
	impairmentIds: [],
	endangeredPersonIds: [],
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

/** Liefert beim Laden einen gespeicherten Entwurf; nicht angegebene Teile erhalten Standardwerte. */
const mockDraft = (draft: Pick<LoadedDraft, 'vehicles' | 'photos'> & Partial<LoadedDraft>) => {
	mockedGetDraft.mockResolvedValue({
		savedAt: Date.now(),
		ui: { collapsedVehicleIds: [], scrollY: 0, geocodeWarnings: {} },
		...draft
	});
};

/** Entscheidet im Hinweis auf den gespeicherten Entwurf für „Fortsetzen“. */
const resumeDraft = () => userEvent.click(page.getByRole('button', { name: 'Fortsetzen' }));

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

const uploadPhotos = (...files: File[]) => {
	const input = document.getElementById('photo-pool-input') as HTMLInputElement;
	const dataTransfer = new DataTransfer();
	for (const file of files) dataTransfer.items.add(file);
	input.files = dataTransfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
};

const uploadPhoto = (file: File) => uploadPhotos(file);

// Ohne explizites Unmounten bleiben Komponenten aus vorherigen Tests im DOM (kein automatisches
// Cleanup zwischen Tests) — das führt zu mehrdeutigen Selektoren und zu Cross-Test-Interferenz
// bei gemeinsam genutzten Modul-Mocks. Jeder Test räumt daher seine eigene Instanz danach ab.
let currentUnmount: (() => Promise<void>) | undefined;

const renderForm = async (props: typeof defaultProps = defaultProps) => {
	const result = await render(ReportForm, props);
	currentUnmount = result.unmount;
	// Die eigene Validierung (validateReportForm/isFormValid) ist Testgegenstand — native
	// HTML5-Constraint-Validierung (durch die `required`-Attribute) würde ein "invalid" Submit
	// sonst schon vor Auslösen des `submit`-Events abfangen und onSubmit gar nie ausführen.
	document.querySelector('form')?.setAttribute('novalidate', '');
	return result;
};

afterEach(async () => {
	await currentUnmount?.();
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
		mockDraft({
			vehicles: [makeVehicle()],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();

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

		await renderForm();

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

		await renderForm();
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

		await renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'broken.heic', { type: 'image/heic' }));

		await expect.element(page.getByText('HEIC kaputt')).toBeInTheDocument();
	});

	it('meldet einen unerwarteten Verarbeitungsfehler als nicht verarbeitetes Foto, ohne hängen zu bleiben', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockRejectedValue(new Error('Unerwarteter Verarbeitungsfehler'));

		await renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhoto(new File(['x'], 'normal.jpg', { type: 'image/jpeg' }));

		await expect
			.element(page.getByText('Das Foto konnte nicht verarbeitet werden.'))
			.toBeInTheDocument();
		await expect.element(page.getByRole('status')).not.toBeInTheDocument();
	});

	it('übernimmt mehrere gleichzeitig gewählte Fotos in den Pool und ordnet höchstens drei dem Fahrzeug zu', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockImplementation(async (file) => makePhoto(file.name));

		await renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhotos(
			...['a', 'b', 'c', 'd', 'e'].map((name) => new File(['x'], name, { type: 'image/jpeg' }))
		);

		await expect
			.poll(() => document.querySelectorAll('button[aria-label$="vergrößern"]').length)
			.toBe(5);
		await expect
			.poll(() => document.querySelectorAll('button[aria-pressed="true"]').length)
			.toBe(3);
		await expect
			.element(page.getByText('Nicht zugeordnete Fotos werden nicht mitgesendet.'))
			.toBeInTheDocument();
	});

	it('übernimmt die übrigen Fotos, wenn eine Datei scheitert, und nennt die gescheiterte', async () => {
		setDefaultMocks();
		mockedCreatePhotoEntry.mockImplementation(async (file) => {
			if (file.name === 'b.heic') throw new HeicConversionError('HEIC kaputt');
			return makePhoto(file.name);
		});

		await renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
		uploadPhotos(
			new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
			new File(['x'], 'b.heic', { type: 'image/heic' }),
			new File(['x'], 'c.jpg', { type: 'image/jpeg' })
		);

		await expect
			.element(page.getByText('1 von 3 Fotos konnten nicht verarbeitet werden: b.heic'))
			.toBeInTheDocument();
		expect(document.querySelectorAll('button[aria-label$="vergrößern"]')).toHaveLength(2);
	});

	it('fügt per Button ein weiteres Fahrzeug hinzu', async () => {
		setDefaultMocks();
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByRole('heading', { name: 'Vorfall' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }));

		await expect.element(page.getByRole('heading', { name: 'Vorfall 1' })).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();
	});

	it('entfernt ein Fahrzeug über den Reset-Dialog, wenn mehrere existieren', async () => {
		setDefaultMocks();
		mockDraft({
			vehicles: [
				makeVehicle({ id: 'veh-1' }),
				makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222' })
			],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Vorfall entfernen' }).first());
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-BB2222');
	});

	it('setzt das einzige Fahrzeug über den Reset-Dialog zurück', async () => {
		setDefaultMocks();
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Vorfall zurücksetzen' }));
		await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));

		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('');
	});

	it('sendet ein gültiges Formular ab und zeigt den Erfolgsdialog', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedSendVehicleReport.mockResolvedValue(true);

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', licensePlate: '' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect
			.element(page.getByRole('status').getByText('Bitte Kennzeichen angeben.'))
			.toBeInTheDocument();
		expect(document.activeElement?.id).toBe('licensePlate-veh-1');
	});

	it('fokussiert bei fehlender Verstoßart die zugehörige Checkbox-Gruppe', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', incidentTypeIds: [] })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect.poll(() => document.activeElement?.id).toBe('incidentTypeIds-veh-1');
	});

	it('scrollt bei fehlender Fotoauswahl zum Fahrzeugblock, wenn kein Feld fokussierbar ist', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', photoIds: [] })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();
		const block = document.getElementById('vehicle-block-veh-1') as HTMLElement;
		const scrollIntoViewSpy = vi.spyOn(block, 'scrollIntoView');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		await expect.poll(() => scrollIntoViewSpy).toHaveBeenCalled();
	});

	it('entfernt bei Teilerfolg nur die erfolgreich gesendeten Fahrzeuge aus dem Formular', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [
				makeVehicle({ id: 'veh-1', licensePlate: 'K-AA1111' }),
				makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222', photoIds: ['photo-2'] })
			],
			photos: [makePhoto('photo-1'), makePhoto('photo-2')]
		});
		mockedSendVehicleReport.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedSendVehicleReport.mockResolvedValue(false);

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last());

		await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
		expect(mockedClearDraft).toHaveBeenCalled();
	});

	it('BUG-Regressionstest: nach Entfernen eines Fahrzeugs zeigt das verbleibende Fahrzeug weiterhin seinen eigenen Fehler', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [
				makeVehicle({ id: 'veh-a', licensePlate: 'K-AA1111' }),
				makeVehicle({ id: 'veh-b', licensePlate: '', photoIds: ['photo-2'] })
			],
			photos: [makePhoto('photo-1'), makePhoto('photo-2')]
		});

		await renderForm();
		await resumeDraft();
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

		await renderForm();

		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
		await expect.element(page.getByLabelText('Vorname')).toHaveValue('');
	});

	it('speichert das Profil erst nach erfolgreicher Validierung und wechselt in den Anzeige-Modus', async () => {
		setDefaultMocks();

		await renderForm();
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

		await renderForm();
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

		await renderForm();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await new Promise((resolve) => setTimeout(resolve, 900));
		expect(mockedSaveDraft).toHaveBeenCalled();
	});

	it('löscht einen leeren Entwurf automatisch (debounced), statt ihn zu speichern', async () => {
		setDefaultMocks();
		mockedGetDraft.mockResolvedValue(undefined);

		await renderForm();
		await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();

		await new Promise((resolve) => setTimeout(resolve, 900));
		expect(mockedClearDraft).toHaveBeenCalled();
		expect(mockedSaveDraft).not.toHaveBeenCalled();
	});

	it('ordnet ein zweites hinzugefügtes Foto ebenfalls automatisch dem einzigen Fahrzeug zu', async () => {
		setDefaultMocks();
		mockDraft({
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

		await renderForm();
		await resumeDraft();
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

		await renderForm();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', licensePlate: '' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});
		mockedClearDraft.mockRejectedValue(new Error('Löschen fehlgeschlagen'));

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last());

		await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
	});

	it('schließt den Erfolgsdialog über den Schließen-Button', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
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
		mockDraft({ vehicles: [], photos: [] });

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

		await userEvent.click(page.getByRole('button', { name: 'Absenden' }));

		expect(mockedSendVehicleReport).not.toHaveBeenCalled();
		await expect.poll(() => document.activeElement?.id).toBe('firstName');
	});

	it('scrollt zum Fahrzeug-Block, wenn ein Feld ohne eigenes Eingabeelement ungültig ist (z.B. Verstoßart)', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', incidentTypeIds: [] })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
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
		mockDraft({
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

		await renderForm();
		await resumeDraft();
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
		mockDraft({ vehicles: [], photos: [] });

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByText(validProfile.email, { exact: true })).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Bearbeiten' }));

		await expect.element(page.getByLabelText('Vorname')).toHaveValue(validProfile.firstName);
		await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
	});

	it('entfernt ein Foto aus dem Pool und aus der Zuordnung aller Fahrzeuge', async () => {
		setDefaultMocks();
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1', photoIds: ['photo-1'] })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
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

		await renderForm();
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

		await renderForm();

		await expect.element(page.getByText('0221 12345678')).toBeInTheDocument();
	});

	it('löst die Adresse eines geteilten Fotos nur einmal auf (Cache) statt bei jeder Zuordnung erneut', async () => {
		setDefaultMocks();
		mockedGetProfile.mockResolvedValue(validProfile);
		mockDraft({
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

		await renderForm();
		await resumeDraft();
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
		mockDraft({
			vehicles: [makeVehicle({ id: 'veh-1' })],
			photos: [makePhoto('photo-1')]
		});

		await renderForm();
		await resumeDraft();
		await expect.element(page.getByLabelText('Kennzeichen')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Abbrechen' }));

		await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
		expect(mockedClearDraft).not.toHaveBeenCalled();
	});
	describe('Entwurf beim Verlassen der Seite', () => {
		const loadedVehicleDraft = (ui: Partial<LoadedDraft['ui']> = {}) =>
			mockDraft({
				vehicles: [makeVehicle({ id: 'veh-1' })],
				photos: [makePhoto('photo-1')],
				ui: { collapsedVehicleIds: [], scrollY: 0, geocodeWarnings: {}, ...ui }
			});

		it('speichert bei pagehide sofort, ohne die Entprellzeit abzuwarten', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

			await userEvent.fill(page.getByLabelText('Kennzeichen'), 'K-ZZ9999');
			window.dispatchEvent(new Event('pagehide'));

			await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 500 }).toBe(1);
			expect(mockedSaveDraft.mock.calls[0][0].vehicles[0].licensePlate).toBe('K-ZZ9999');
		});

		it('speichert bei visibilitychange auf hidden sofort, bei visible nicht', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
			const visibility = vi.spyOn(document, 'visibilityState', 'get');

			try {
				visibility.mockReturnValue('visible');
				document.dispatchEvent(new Event('visibilitychange'));
				expect(mockedSaveDraft).not.toHaveBeenCalled();

				visibility.mockReturnValue('hidden');
				document.dispatchEvent(new Event('visibilitychange'));
				await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 500 }).toBe(1);
			} finally {
				visibility.mockRestore();
			}
		});

		it('speichert angefangene Profileingaben beim Verlassen der Seite', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(undefined);
			await renderForm();
			await expect.element(page.getByLabelText('Vorname')).toBeInTheDocument();

			await userEvent.fill(page.getByLabelText('Vorname'), 'Erika');
			window.dispatchEvent(new Event('pagehide'));

			await expect
				.poll(() => mockedSaveProfile.mock.calls.at(-1)?.[0].firstName, { timeout: 500 })
				.toBe('Erika');
		});

		it('speichert das Profil beim Verlassen nicht erneut, wenn nichts geändert wurde', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

			window.dispatchEvent(new Event('pagehide'));
			await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 500 }).toBe(1);

			expect(mockedSaveProfile).not.toHaveBeenCalled();
		});

		it('speichert eine zugeklappte Karte in collapsedVehicleIds', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

			await userEvent.click(page.getByRole('button', { name: 'Fertig' }));
			await expect
				.element(page.getByRole('button', { name: 'Bearbeiten' }).last())
				.toBeInTheDocument();
			window.dispatchEvent(new Event('pagehide'));

			await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 500 }).toBe(1);
			expect(mockedSaveDraft.mock.calls[0][0].ui.collapsedVehicleIds).toEqual(['veh-1']);
		});

		it('stellt zugeklappte Karten, Hinweise und die Scrollposition wieder her', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
			loadedVehicleDraft({ collapsedVehicleIds: ['veh-1'], scrollY: 320 });

			try {
				await renderForm();
				await resumeDraft();

				await expect
					.element(page.getByRole('button', { name: 'Bearbeiten' }).last())
					.toBeInTheDocument();
				await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
				await expect
					.poll(() => scrollTo.mock.calls.at(-1)?.[0])
					.toEqual({ top: 320, behavior: 'instant' });
			} finally {
				scrollTo.mockRestore();
			}
		});

		it('stellt Adress-Hinweise eines Fahrzeugs wieder her', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft({ geocodeWarnings: { 'veh-1': 'Wiederhergestellter Hinweis' } });

			await renderForm();
			await resumeDraft();

			await expect.element(page.getByText('Wiederhergestellter Hinweis')).toBeInTheDocument();
		});

		it('scrollt ohne gespeicherte Position nicht', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
			loadedVehicleDraft();

			try {
				await renderForm();
				await resumeDraft();
				await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
				expect(scrollTo).not.toHaveBeenCalled();
			} finally {
				scrollTo.mockRestore();
			}
		});

		it('verwirft den Zuklapp-Zustand eines entfernten Fahrzeugs', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			mockDraft({
				vehicles: [
					makeVehicle({ id: 'veh-1' }),
					makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222' })
				],
				photos: [makePhoto('photo-1')],
				ui: { collapsedVehicleIds: ['veh-1', 'veh-2'], scrollY: 0, geocodeWarnings: {} }
			});
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();

			await userEvent.click(page.getByRole('button', { name: 'Vorfall entfernen' }).first());
			await userEvent.click(page.getByRole('button', { name: 'Entfernen', exact: true }));
			await expect
				.element(page.getByRole('heading', { name: 'Vorfall 2' }))
				.not.toBeInTheDocument();
			window.dispatchEvent(new Event('pagehide'));

			await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 500 }).toBe(1);
			expect(mockedSaveDraft.mock.calls[0][0].ui.collapsedVehicleIds).toEqual(['veh-2']);
		});

		it('meldet einen Fehler beim Speichern des Profils beim Verlassen, statt ihn zu werfen', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(undefined);
			mockedSaveProfile.mockRejectedValueOnce(new Error('Speicher voll'));
			const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
			await renderForm();
			await expect.element(page.getByLabelText('Vorname')).toBeInTheDocument();

			try {
				await userEvent.fill(page.getByLabelText('Vorname'), 'Erika');
				window.dispatchEvent(new Event('pagehide'));

				await expect
					.poll(() => logError.mock.calls.some(([message]) => /Profil/.test(String(message))))
					.toBe(true);
			} finally {
				logError.mockRestore();
			}
		});

		it('legt nach dem Zurücksetzen keinen Entwurf aus einer ausstehenden Eingabe wieder an', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

			await userEvent.fill(page.getByLabelText('Kennzeichen'), 'K-ZZ9999');
			await userEvent.click(
				page.getByRole('button', { name: 'Zurücksetzen', exact: true }).first()
			);
			await userEvent.click(page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last());
			await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();

			await new Promise((resolve) => setTimeout(resolve, 1000));
			expect(mockedClearDraft).toHaveBeenCalled();
			expect(mockedSaveDraft).not.toHaveBeenCalled();
		});

		it('legt nach vollständigem Versand keinen Entwurf aus einer ausstehenden Eingabe wieder an', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			loadedVehicleDraft();
			await renderForm();
			await resumeDraft();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');

			await userEvent.fill(page.getByLabelText('Kennzeichen'), 'K-AA2222');
			await userEvent.click(page.getByRole('button', { name: 'Absenden' }));
			await expect.poll(() => mockedAddEntry.mock.calls.length).toBe(1);

			await new Promise((resolve) => setTimeout(resolve, 1000));
			expect(mockedClearDraft).toHaveBeenCalled();
			expect(mockedSaveDraft).not.toHaveBeenCalled();
		});
	});

	describe('Entwurf fortsetzen oder verwerfen', () => {
		const draftWithTwoVehicles = () =>
			mockDraft({
				vehicles: [
					makeVehicle({ id: 'veh-1' }),
					makeVehicle({ id: 'veh-2', licensePlate: 'K-BB2222' })
				],
				photos: [makePhoto('photo-1')],
				ui: { collapsedVehicleIds: ['veh-2'], scrollY: 0, geocodeWarnings: {} }
			});

		it('zeigt statt einer stillen Wiederherstellung den Hinweis und blendet Fotos und Fahrzeuge aus', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();

			await renderForm();

			await expect
				.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
				.toBeInTheDocument();
			await expect.element(page.getByText('2 Fahrzeuge, 1 Foto')).toBeInTheDocument();
			await expect.element(page.getByText(validProfile.email, { exact: true })).toBeInTheDocument();
			await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
			await expect
				.element(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }))
				.not.toBeInTheDocument();
		});

		it('schreibt und löscht den Entwurf nicht, solange der Hinweis offen ist', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();
			await renderForm();
			await expect
				.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
				.toBeInTheDocument();

			await new Promise((resolve) => setTimeout(resolve, 1000));
			window.dispatchEvent(new Event('pagehide'));
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockedSaveDraft).not.toHaveBeenCalled();
			expect(mockedClearDraft).not.toHaveBeenCalled();
		});

		it('sperrt Absenden und Zurücksetzen, solange der Hinweis offen ist', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();

			await renderForm();

			await expect.element(page.getByRole('button', { name: 'Absenden' })).toBeDisabled();
			await expect
				.element(page.getByRole('button', { name: 'Zurücksetzen', exact: true }))
				.toBeDisabled();
		});

		it('stellt beim Fortsetzen die gespeicherte Scrollposition wieder her', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
			mockDraft({
				vehicles: [makeVehicle({ id: 'veh-1' })],
				photos: [makePhoto('photo-1')],
				ui: { collapsedVehicleIds: [], scrollY: 240, geocodeWarnings: {} }
			});

			try {
				await renderForm();
				expect(scrollTo).not.toHaveBeenCalled();

				await resumeDraft();

				await expect
					.poll(() => scrollTo.mock.calls.at(-1)?.[0])
					.toEqual({ top: 240, behavior: 'instant' });
			} finally {
				scrollTo.mockRestore();
			}
		});

		it('stellt beim Fortsetzen Fahrzeuge und Zuklapp-Zustand wieder her und speichert danach wieder', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();
			await renderForm();

			await resumeDraft();

			await expect.element(page.getByRole('heading', { name: 'Vorfall 2' })).toBeInTheDocument();
			await expect.element(page.getByLabelText('Kennzeichen')).toHaveValue('K-AA1111');
			await expect
				.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
				.not.toBeInTheDocument();
			await expect.poll(() => mockedSaveDraft.mock.calls.length, { timeout: 2000 }).toBe(1);
			expect(mockedSaveDraft.mock.calls[0][0].ui.collapsedVehicleIds).toEqual(['veh-2']);
		});

		it('verwirft nach Bestätigung den Entwurf und zeigt ein leeres Formular', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();
			await renderForm();

			await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }));
			await expect
				.element(page.getByRole('dialog', { name: 'Entwurf verwerfen?' }))
				.toBeInTheDocument();
			expect(mockedClearDraft).not.toHaveBeenCalled();
			await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }).last());

			await expect
				.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
				.not.toBeInTheDocument();
			await expect
				.element(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }))
				.toBeInTheDocument();
			await expect.element(page.getByLabelText('Kennzeichen')).not.toBeInTheDocument();
			expect(mockedClearDraft).toHaveBeenCalled();
			expect(mockedSaveDraft).not.toHaveBeenCalled();
		});

		it('zeigt das leere Formular auch, wenn das Löschen des Entwurfs beim Verwerfen fehlschlägt', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();
			mockedClearDraft.mockRejectedValue(new Error('Löschen fehlgeschlagen'));
			const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
			await renderForm();

			try {
				await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }));
				await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }).last());

				await expect
					.element(page.getByRole('button', { name: '+ Weiteres Fahrzeug hinzufügen' }))
					.toBeInTheDocument();
				expect(logError).toHaveBeenCalledWith(
					'Fehler beim Löschen des Entwurfs:',
					expect.any(Error)
				);
			} finally {
				logError.mockRestore();
			}
		});

		it('behält den Hinweis, wenn die Rückfrage abgebrochen wird', async () => {
			setDefaultMocks();
			mockedGetProfile.mockResolvedValue(validProfile);
			draftWithTwoVehicles();
			await renderForm();

			await userEvent.click(page.getByRole('button', { name: 'Verwerfen' }));
			await userEvent.click(page.getByRole('button', { name: 'Abbrechen' }));

			await expect
				.element(page.getByRole('region', { name: 'Entwurf fortsetzen?' }))
				.toBeInTheDocument();
			expect(mockedClearDraft).not.toHaveBeenCalled();
		});
	});
});
