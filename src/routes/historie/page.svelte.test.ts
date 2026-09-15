import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { HistoryEntry } from '$lib/history/db';

const listEntriesMock = vi.fn(async () => [] as HistoryEntry[]);
const deleteEntryMock = vi.fn(async (id: string) => {
	void id;
});
const clearEntriesMock = vi.fn(async () => {});
vi.mock('$lib/history/db', () => ({
	listEntries: () => listEntriesMock(),
	deleteEntry: (id: string) => deleteEntryMock(id),
	clearEntries: () => clearEntriesMock()
}));

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
	id: crypto.randomUUID(),
	timestamp: Date.now(),
	firstName: 'Max',
	lastName: 'Mustermann',
	locationAddress: 'Domkloster 4, 50667 Köln',
	incidentTypeLabels: ['Parken auf dem Gehweg'],
	licensePlate: 'K-AB1234',
	make: 'BMW',
	color: 'Rot',
	thumbnails: [],
	...overrides
});

describe('Historie-Seite', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('zeigt einen Lade-Status und danach die leere Historie', async () => {
		listEntriesMock.mockResolvedValueOnce([]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		await expect.element(page.getByText('Noch keine Anzeigen versendet.')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Alle löschen' }))
			.not.toBeInTheDocument();
	});

	it('löscht einen einzelnen Eintrag nach Bestätigung', async () => {
		const entry = makeEntry();
		listEntriesMock.mockResolvedValueOnce([entry]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		await expect.element(page.getByText('K-AB1234 · BMW · Rot')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Eintrag löschen' }));
		const dialog = page.getByRole('dialog', { name: 'Eintrag löschen?' });
		await expect.element(dialog).toBeInTheDocument();

		await userEvent.click(dialog.getByRole('button', { name: 'Löschen' }));

		expect(deleteEntryMock).toHaveBeenCalledWith(entry.id);
		await expect.element(page.getByText('K-AB1234 · BMW · Rot')).not.toBeInTheDocument();
	});

	it('bricht das Löschen eines einzelnen Eintrags ab, wenn abgebrochen wird', async () => {
		const entry = makeEntry();
		listEntriesMock.mockResolvedValueOnce([entry]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);
		await expect.element(page.getByText('K-AB1234 · BMW · Rot')).toBeInTheDocument();

		await userEvent.click(page.getByRole('button', { name: 'Eintrag löschen' }));
		const dialog = page.getByRole('dialog', { name: 'Eintrag löschen?' });
		await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));

		expect(deleteEntryMock).not.toHaveBeenCalled();
		await expect.element(page.getByText('K-AB1234 · BMW · Rot')).toBeInTheDocument();
	});

	it('zeigt Beweisfotos an und öffnet sie in der Lightbox', async () => {
		const entry = makeEntry({
			licensePlate: undefined,
			thumbnails: [new Blob(['x'], { type: 'image/jpeg' })]
		});
		listEntriesMock.mockResolvedValueOnce([entry]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		const thumbButton = page.getByRole('button', { name: 'Beweisfoto 1 von 1 vergrößern' });
		await expect.element(thumbButton).toBeInTheDocument();
		await expect.element(page.getByText('K-AB1234 · BMW · Rot')).not.toBeInTheDocument();

		await userEvent.click(thumbButton);
		const lightboxDialog = page.getByRole('dialog');
		await expect.element(lightboxDialog).toBeInTheDocument();

		await userEvent.click(lightboxDialog.getByRole('button', { name: 'Schließen' }));
		await expect.element(lightboxDialog).not.toBeInTheDocument();
	});

	it('zeigt das Kennzeichen im Alt-Text der Lightbox, wenn eines hinterlegt ist', async () => {
		const entry = makeEntry({ thumbnails: [new Blob(['x'], { type: 'image/jpeg' })] });
		listEntriesMock.mockResolvedValueOnce([entry]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		await userEvent.click(page.getByRole('button', { name: 'Beweisfoto 1 von 1 vergrößern' }));
		await expect
			.element(page.getByRole('img', { name: 'Beweisfoto 1 von 1 zu Kennzeichen K-AB1234' }))
			.toBeInTheDocument();
	});

	it('löscht alle Einträge nach Bestätigung', async () => {
		listEntriesMock.mockResolvedValueOnce([makeEntry(), makeEntry()]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		const deleteAllButton = page.getByRole('button', { name: 'Alle löschen' });
		await expect.element(deleteAllButton).toBeInTheDocument();
		await userEvent.click(deleteAllButton);

		const dialog = page.getByRole('dialog', { name: 'Alle Einträge löschen?' });
		await expect.element(dialog).toHaveTextContent('2 Einträge');
		await userEvent.click(dialog.getByRole('button', { name: 'Alle löschen' }));

		expect(clearEntriesMock).toHaveBeenCalled();
		await expect.element(page.getByText('Noch keine Anzeigen versendet.')).toBeInTheDocument();
	});

	it('bricht das Löschen aller Einträge ab, wenn abgebrochen wird', async () => {
		listEntriesMock.mockResolvedValueOnce([makeEntry(), makeEntry()]);
		const { default: HistoriePage } = await import('./+page.svelte');

		render(HistoriePage);

		await userEvent.click(page.getByRole('button', { name: 'Alle löschen' }));
		const dialog = page.getByRole('dialog', { name: 'Alle Einträge löschen?' });
		await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));

		expect(clearEntriesMock).not.toHaveBeenCalled();
		await expect.element(page.getByRole('button', { name: 'Alle löschen' })).toBeInTheDocument();
	});
});
