import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { CITIES } from '$lib/config/cities';
import {
	buildEmailTemplateInput,
	resolveVehicleIncidentTypes
} from '$lib/email/buildEmailTemplateInput';
import { createEmptyVehicle } from '$lib/validation/emptyForm';
import type { PhotoEntry, ProfileFields, VehicleEntry } from '$lib/validation/formSchema';
import VehiclePreviewDialog from './VehiclePreviewDialog.svelte';

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
	vehicleType: 'PKW',
	make: 'VW',
	color: 'Rot',
	incidentTypeIds: ['halteverbot'],
	date: '2024-01-05',
	time: '10:00',
	locationStreet: 'Domkloster',
	locationHouseNumber: '4',
	locationPostcode: '50667',
	locationCity: 'Köln',
	...overrides
});

const baseProps = () => ({
	dialog: undefined,
	index: 0,
	total: 1,
	pool: [makePhoto('photo-1')] as PhotoEntry[],
	city,
	profile,
	recipientEmail: 'buergeramt@koeln.de',
	missingFieldMessages: [] as string[]
});

const expectedEmail = (vehicle: VehicleEntry, index = 0, total = 1) =>
	city.buildEmailBody(
		buildEmailTemplateInput({
			profile,
			vehicle,
			incidentTypes: resolveVehicleIncidentTypes(city, vehicle),
			photoCount: vehicle.photoIds.length,
			vehicleIndex: index + 1,
			vehicleTotal: total
		})
	);

// Der Dialog rendert seinen Inhalt zwar immer, ein geschlossenes <dialog> ist für die
// Sichtbarkeitsprüfungen der Locator-API aber nicht vorhanden — daher vor jeder Assertion öffnen.
const renderOpened = (props: Record<string, unknown>) => {
	const screen = render(VehiclePreviewDialog, props);
	const dialog = screen.container.querySelector('dialog') as HTMLDialogElement;
	dialog.showModal();
	return dialog;
};

describe('VehiclePreviewDialog', () => {
	it('zeigt die Mängelliste statt der Vorschau, solange Pflichtfelder fehlen', async () => {
		renderOpened({
			...baseProps(),
			vehicle: createEmptyVehicle('vehicle-1'),
			missingFieldMessages: ['Kennzeichen fehlt', 'Fahrzeugart fehlt']
		});

		await expect
			.element(page.getByText('Noch nicht einklappbar, bitte prüfen:'))
			.toBeInTheDocument();
		await expect.element(page.getByText('Kennzeichen fehlt')).toBeInTheDocument();
		await expect.element(page.getByText('Fahrzeugart fehlt')).toBeInTheDocument();
		await expect.element(page.getByText('Betreff')).not.toBeInTheDocument();
	});

	it('rendert Empfänger, Betreff und Nachricht der E-Mail bei vollständigen Angaben', async () => {
		const vehicle = makeCompleteVehicle();
		const dialog = renderOpened({ ...baseProps(), vehicle });

		const email = expectedEmail(vehicle);
		await expect.element(page.getByText('buergeramt@koeln.de')).toBeInTheDocument();
		await expect.element(page.getByText(email.subject)).toBeInTheDocument();
		expect(dialog.querySelector('pre')?.textContent).toBe(email.body);
	});

	it('nennt die eigene E-Mail-Adresse in Klammern in der Kopie-Zeile', async () => {
		renderOpened({ ...baseProps(), vehicle: makeCompleteVehicle() });

		await expect
			.element(page.getByText(/Eine Kopie geht zusätzlich an deine eigene Adresse/))
			.toHaveTextContent('(erika@example.com)');
	});

	it('lässt die Klammer in der Kopie-Zeile weg, wenn das Profil keine E-Mail-Adresse hat', async () => {
		renderOpened({
			...baseProps(),
			profile: { ...profile, email: '' },
			vehicle: makeCompleteVehicle()
		});

		await expect
			.element(page.getByText(/Eine Kopie geht zusätzlich an deine eigene Adresse/))
			.not.toHaveTextContent('(');
	});

	it('zeigt bei einem einzelnen Fahrzeug den Titel "Vorschau"', async () => {
		renderOpened({ ...baseProps(), vehicle: makeCompleteVehicle() });

		await expect.element(page.getByRole('dialog', { name: 'Vorschau' })).toBeInTheDocument();
	});

	it('nennt bei mehreren Fahrzeugen die Position im Titel', async () => {
		renderOpened({ ...baseProps(), vehicle: makeCompleteVehicle(), index: 1, total: 3 });

		await expect
			.element(page.getByRole('dialog', { name: 'Vorschau: Fahrzeug 2 von 3' }))
			.toBeInTheDocument();
	});

	it('zeigt die Anhang-Vorschau nur für die dem Fahrzeug zugeordneten Fotos', async () => {
		renderOpened({
			...baseProps(),
			pool: [makePhoto('photo-1'), makePhoto('photo-2')],
			vehicle: makeCompleteVehicle({ photoIds: ['photo-1'] })
		});

		await expect.element(page.getByText('Anhang')).toBeInTheDocument();
		await expect.element(page.getByAltText('Beweisfoto 1 von 1')).toBeInTheDocument();
		await expect.element(page.getByAltText('Beweisfoto 2 von 2')).not.toBeInTheDocument();
	});

	it('zeigt keine Anhang-Vorschau, wenn dem Fahrzeug kein Foto zugeordnet ist', async () => {
		renderOpened({
			...baseProps(),
			vehicle: makeCompleteVehicle({ photoIds: [] })
		});

		await expect.element(page.getByText('Anhang')).not.toBeInTheDocument();
	});

	it('schließt den Dialog über den Schließen-Button', async () => {
		const dialog = renderOpened({ ...baseProps(), vehicle: makeCompleteVehicle() });

		await userEvent.click(page.getByRole('button', { name: 'Schließen' }));

		await expect.poll(() => dialog.open).toBe(false);
	});
});
