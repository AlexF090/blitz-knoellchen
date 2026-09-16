import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { MAX_PHOTOS_PER_BATCH, type PhotoEntry } from '$lib/validation/formSchema';
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
	it('ruft onAdd pro ausgewählter Datei bis zum Batch-Limit auf', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const { container } = render(PhotoPool, {
			photos: [],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		expect(input).not.toBeNull();
		dispatchFileChange(input!, [makeFile('a.jpg'), makeFile('b.jpg')]);

		await expect.poll(() => onAdd).toBeCalledTimes(2);
	});

	it('ruft onAdd nicht auf, wenn die Dateiauswahl leer ist (z.B. Dialog abgebrochen)', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const { container } = render(PhotoPool, {
			photos: [],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		dispatchFileChange(input!, []);

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(onAdd).not.toHaveBeenCalled();
	});

	it('zeigt eine batchError-Meldung, wenn mehr Dateien als MAX_PHOTOS_PER_BATCH ausgewählt werden, und ruft onAdd nur bis zum Batch-Limit auf', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const { container } = render(PhotoPool, {
			photos: [],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		const files = Array.from({ length: MAX_PHOTOS_PER_BATCH + 1 }, (_, index) =>
			makeFile(`f${index}.jpg`)
		);
		dispatchFileChange(input!, files);

		await expect
			.element(
				page.getByText(
					`Es können maximal ${MAX_PHOTOS_PER_BATCH} Fotos gleichzeitig hinzugefügt werden.`
				)
			)
			.toBeInTheDocument();
		await expect.poll(() => onAdd).toBeCalledTimes(MAX_PHOTOS_PER_BATCH);
	});

	it('ruft onAdd NICHT auf, wenn das Gesamtlimit maxPhotos bereits erreicht ist (Bug-Fix)', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photos = [makePhoto(), makePhoto()];
		const { container } = render(PhotoPool, {
			photos,
			maxPhotos: 2,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		// Das sichtbare Label ist ausgeblendet, das Input-Element bleibt aber im DOM bedienbar —
		// genau dieser Pfad (Datei-Auswahl direkt über das versteckte Input) muss trotz erreichtem
		// maxPhotos verhindert werden.
		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		expect(input).not.toBeNull();
		dispatchFileChange(input!, [makeFile('c.jpg')]);

		await expect
			.element(page.getByText('Das Gesamtlimit von 2 Fotos ist bereits erreicht.'))
			.toBeInTheDocument();
		// Kurz warten, damit ein evtl. asynchroner (fehlerhafter) onAdd-Aufruf Zeit hätte zu laufen.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(onAdd).not.toHaveBeenCalled();
	});

	it('clamped auf die verbleibenden Slots und zeigt die Gesamtlimit-Meldung, wenn maxPhotos fast erreicht ist (Bug-Fix)', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photos = [makePhoto()];
		const { container } = render(PhotoPool, {
			photos,
			maxPhotos: 2,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const input = container.querySelector<HTMLInputElement>('#photo-pool-input');
		dispatchFileChange(input!, [makeFile('a.jpg'), makeFile('b.jpg')]);

		await expect.poll(() => onAdd).toBeCalledTimes(1);
		await expect
			.element(page.getByText('Das Gesamtlimit von 2 Fotos ist bereits erreicht.'))
			.toBeInTheDocument();
	});

	it('zeigt error- und processingError-Props als Alerts an', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		render(PhotoPool, {
			photos: [],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			error: 'Mindestens ein Foto ist erforderlich.',
			processingError: 'Foto konnte nicht verarbeitet werden.',
			onAdd,
			onRemove
		});

		await expect
			.element(page.getByText('Mindestens ein Foto ist erforderlich.', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Foto konnte nicht verarbeitet werden.'))
			.toBeInTheDocument();
	});

	it('zeigt einen Spinner, solange processing=true ist, und blendet das Auswahl-Label aus', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		render(PhotoPool, {
			photos: [],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			processing: true,
			onAdd,
			onRemove
		});

		await expect
			.element(page.getByRole('status', { name: 'Foto wird verarbeitet…' }))
			.toBeInTheDocument();
	});

	it('ruft onRemove mit der korrekten photoId auf', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'zuentfernen.jpg' });
		render(PhotoPool, {
			photos: [photo],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const removeButton = page.getByRole('button', { name: 'Foto zuentfernen.jpg entfernen' });
		await removeButton.click();

		expect(onRemove).toHaveBeenCalledWith(photo.id);
	});

	it('öffnet die Lightbox beim Klick auf ein Foto', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'gross.jpg' });
		render(PhotoPool, {
			photos: [photo],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		const photoButton = page.getByRole('button', { name: 'Foto gross.jpg vergrößern' });
		await photoButton.click();

		await expect.element(page.getByRole('dialog', { name: 'Foto-Vorschau' })).toBeInTheDocument();
	});

	it('schließt die Lightbox wieder (onClose), wenn sie über den Backdrop geschlossen wird', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto({ fileName: 'gross.jpg' });
		const { container } = render(PhotoPool, {
			photos: [photo],
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
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
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto();
		render(PhotoPool, {
			photos: [photo],
			usageCounts: { [photo.id]: 2 },
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		await expect.element(page.getByLabelText('Verwendet bei 2 Fahrzeugen')).toBeInTheDocument();
	});

	it('zeigt kein Badge, wenn usageCounts für das Foto <= 1 ist', async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const photo = makePhoto();
		render(PhotoPool, {
			photos: [photo],
			usageCounts: { [photo.id]: 1 },
			maxPhotos: 9,
			maxPhotosPerVehicle: 3,
			onAdd,
			onRemove
		});

		await expect.element(page.getByLabelText(/Verwendet bei/)).not.toBeInTheDocument();
	});
});
