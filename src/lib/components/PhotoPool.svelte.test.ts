import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { PhotoEntry } from '$lib/validation/formSchema';
import PhotoPool from './PhotoPool.svelte';

const makePhoto = (overrides: Partial<PhotoEntry> = {}): PhotoEntry => ({
	id: crypto.randomUUID(),
	blob: new Blob(['x'], { type: 'image/png' }),
	fileName: 'foto.jpg',
	gps: null,
	date: null,
	time: null,
	...overrides
});

const makeFile = (name = 'foto.jpg') => new File(['x'], name, { type: 'image/jpeg' });

const dispatchFileChange = (input: HTMLInputElement, files: File[]) => {
	const dataTransfer = new DataTransfer();
	for (const file of files) dataTransfer.items.add(file);
	input.files = dataTransfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('PhotoPool', () => {
	it('ruft onAddFiles einmal mit allen ausgewählten Dateien auf', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		expect(input).not.toBeNull();
		dispatchFileChange(input!, [makeFile('a.jpg'), makeFile('b.jpg')]);

		await expect.poll(() => onAddFiles).toBeCalledTimes(1);
		expect(onAddFiles.mock.calls[0][0]).toHaveLength(2);
	});

	it('ruft onAddFiles nicht auf, wenn die Dateiauswahl leer ist (z.B. Dialog abgebrochen)', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		dispatchFileChange(input!, []);

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(onAddFiles).not.toHaveBeenCalled();
	});

	it('meldet viele Dateien ohne Limit gesammelt in einem einzigen Aufruf', async () => {
		const onAddFiles = vi.fn();
		const { container } = await render(PhotoPool, {
			photos: [makePhoto(), makePhoto(), makePhoto()],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove: vi.fn()
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		const files = Array.from({ length: 12 }, (_, index) => makeFile(`f${index}.jpg`));
		dispatchFileChange(input!, files);

		await expect.poll(() => onAddFiles).toBeCalledTimes(1);
		expect(onAddFiles.mock.calls[0][0].map((file: File) => file.name)).toEqual(
			files.map((file) => file.name)
		);
	});

	it('nennt kein Pool-Limit, sondern das Limit pro Fahrzeug', async () => {
		await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await expect.element(page.getByText('maximal 3 Fotos möglich')).toBeInTheDocument();
		await expect.element(page.getByText('Gesamtlimit')).not.toBeInTheDocument();
	});

	it('zeigt error- und processingError-Props als Alerts an', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			error: 'Mindestens ein Foto ist erforderlich.',
			processingError: 'Foto konnte nicht verarbeitet werden.',
			onAddFiles,
			onRemove
		});

		await expect
			.element(page.getByText('Mindestens ein Foto ist erforderlich.', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Foto konnte nicht verarbeitet werden.'))
			.toBeInTheDocument();
	});

	it('zeigt den Fortschritt je Foto sichtbar, aber vor Bildschirmlesern verborgen', async () => {
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			progress: { current: 2, total: 5 },
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		const progressText = page.getByText('Foto 2 von 5 wird verarbeitet …');
		await expect.element(progressText).toBeVisible();
		expect(progressText.element().getAttribute('aria-hidden')).toBe('true');
		expect(container.querySelector<HTMLInputElement>('#photo-pool-input')?.disabled).toBe(true);
	});

	it('hält die Foto-Schaltfläche während der Verarbeitung eingehängt, aber gesperrt', async () => {
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			progress: { current: 1, total: 2 },
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		const label = container.querySelector<HTMLLabelElement>('label[for="photo-pool-input"]');
		expect(label).not.toBeNull();
		expect(label?.contains(container.querySelector('#photo-pool-input'))).toBe(true);
		expect(container.querySelector<HTMLInputElement>('#photo-pool-input')?.disabled).toBe(true);
		// Die Test-Umgebung lädt kein Tailwind; geprüft wird daher, dass die Sperr-Optik am Label hängt.
		expect(label?.className).toContain('has-[:disabled]:opacity-50');
	});

	it('zeigt einen sichtbaren Fokusring am Label, wenn das Eingabefeld Tastaturfokus hat', async () => {
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		const label = container.querySelector<HTMLLabelElement>('label[for="photo-pool-input"]');
		// Das Eingabefeld liegt im Label, damit `has-[:focus-visible]` dessen Fokusring zeichnen kann.
		expect(label?.contains(input)).toBe(true);
		expect(label?.className).toContain('has-[:focus-visible]:outline-2');
	});

	it('hat eine dauerhafte, anfangs leere Live-Region', async () => {
		await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await expect.element(page.getByRole('status')).toBeInTheDocument();
		await expect.poll(() => page.getByRole('status').element().textContent).toBe('');
	});

	it('kündigt Start und Ende der Verarbeitung an, nicht jedes einzelne Foto', async () => {
		const { rerender } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			progress: { current: 1, total: 12 },
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await expect
			.element(page.getByRole('status'))
			.toHaveTextContent('12 Fotos werden verarbeitet …');

		await rerender({ progress: { current: 7, total: 12 } });
		await expect
			.element(page.getByRole('status'))
			.toHaveTextContent('12 Fotos werden verarbeitet …');

		await rerender({ progress: null });
		await expect.element(page.getByRole('status')).toHaveTextContent('12 Fotos verarbeitet');
	});

	it('verwendet für ein einzelnes Foto den Singular in der Ansage', async () => {
		const { rerender } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			progress: { current: 1, total: 1 },
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await expect.element(page.getByRole('status')).toHaveTextContent('1 Foto wird verarbeitet …');
		await rerender({ progress: null });
		await expect.element(page.getByRole('status')).toHaveTextContent('1 Foto verarbeitet');
	});

	it('meldet bei Fehlern keinen Erfolg, sondern überlässt die Ansage der Fehlermeldung', async () => {
		const { rerender } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			progress: { current: 1, total: 3 },
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await rerender({
			progress: null,
			processingError: '1 von 3 Fotos konnten nicht verarbeitet werden: a.jpg'
		});

		await expect.poll(() => page.getByRole('status').element().textContent).toBe('');
		await expect.element(page.getByRole('alert')).toBeInTheDocument();
	});

	it('lässt die Auswahl ohne laufende Verarbeitung zu', async () => {
		const { container } = await render(PhotoPool, {
			photos: [],
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		expect(container.querySelector<HTMLInputElement>('#photo-pool-input')?.disabled).toBe(false);
	});

	it('kennzeichnet nicht zugeordnete Fotos und weist darauf hin, dass sie nicht mitgesendet werden', async () => {
		const assigned = makePhoto({ fileName: 'zugeordnet.jpg' });
		const unassigned = makePhoto({ fileName: 'offen.jpg' });
		await render(PhotoPool, {
			photos: [assigned, unassigned],
			usageCounts: { [assigned.id]: 1 },
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		const badge = page.getByText('nicht zugeordnet', { exact: true });
		await expect.element(badge).toBeInTheDocument();
		expect(badge.element().getAttribute('aria-hidden')).toBe('true');
		// Der Zustand steckt im Namen des Foto-Buttons statt im verborgenen Badge.
		await expect
			.element(page.getByRole('button', { name: 'Foto offen.jpg vergrößern, nicht zugeordnet' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Foto zugeordnet.jpg vergrößern', exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Nicht zugeordnete Fotos werden nicht mitgesendet.'))
			.toBeInTheDocument();
	});

	it('zeigt keinen Hinweis, wenn alle Fotos zugeordnet sind', async () => {
		const photo = makePhoto();
		await render(PhotoPool, {
			photos: [photo],
			usageCounts: { [photo.id]: 1 },
			maxPhotosPerVehicle: 3,
			onAddFiles: vi.fn(),
			onRemove: vi.fn()
		});

		await expect.element(page.getByText('nicht zugeordnet')).not.toBeInTheDocument();
		await expect.element(page.getByText('Nicht zugeordnete Fotos')).not.toBeInTheDocument();
	});

	it('ruft onRemove mit der korrekten photoId auf', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'zuentfernen.jpg' });
		await render(PhotoPool, {
			photos: [photo],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		const removeButton = page.getByRole('button', { name: 'Foto zuentfernen.jpg entfernen' });
		await removeButton.click();

		expect(onRemove).toHaveBeenCalledWith(photo.id);
	});

	it('öffnet die Lightbox beim Klick auf ein Foto', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'gross.jpg' });
		await render(PhotoPool, {
			photos: [photo],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		const photoButton = page.getByRole('button', { name: 'Foto gross.jpg vergrößern' });
		await photoButton.click();

		await expect.element(page.getByRole('dialog', { name: 'Foto-Vorschau' })).toBeInTheDocument();
	});

	it('schließt die Lightbox wieder (onClose), wenn sie über den Backdrop geschlossen wird', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'gross.jpg' });
		const { container } = await render(PhotoPool, {
			photos: [photo],
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		const photoButton = page.getByRole('button', { name: 'Foto gross.jpg vergrößern' });
		await photoButton.click();
		const dialog = container.querySelector<HTMLDialogElement>('dialog');
		await expect.poll(() => dialog?.open).toBe(true);

		dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		await expect.poll(() => dialog?.open).toBe(false);
	});

	it('zeigt das usageCounts-Badge mit dem korrekten Wert an, wenn ein Foto mehrfach genutzt wird', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto();
		await render(PhotoPool, {
			photos: [photo],
			usageCounts: { [photo.id]: 2 },
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		await expect.element(page.getByLabelText('Verwendet bei 2 Fahrzeugen')).toBeInTheDocument();
	});

	it('zeigt kein Badge, wenn usageCounts für das Foto <= 1 ist', async () => {
		const onAddFiles = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto();
		await render(PhotoPool, {
			photos: [photo],
			usageCounts: { [photo.id]: 1 },
			maxPhotosPerVehicle: 3,
			onAddFiles,
			onRemove
		});

		await expect.element(page.getByLabelText(/Verwendet bei/)).not.toBeInTheDocument();
	});
});
