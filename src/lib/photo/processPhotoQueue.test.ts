import { describe, expect, it, vi } from 'vitest';
import type { PhotoEntry } from '$lib/validation/formSchema';
import { HeicConversionError } from './createPhotoEntry';
import { processPhotoQueue, type PhotoQueueProgress } from './processPhotoQueue';

const makeFile = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

const makeEntry = (fileName: string): PhotoEntry => ({
	id: `id-${fileName}`,
	blob: new Blob(['x']),
	fileName,
	gps: null,
	date: null,
	time: null
});

interface Deferred {
	file: File;
	resolve: () => void;
	reject: (error: unknown) => void;
}

/** Verarbeitung, die erst auf Zuruf fertig wird — erlaubt, den Zwischenzustand zu prüfen. */
const createControlledProcess = () => {
	const pending: Deferred[] = [];
	let running = 0;
	let maxRunning = 0;
	const process = (file: File) =>
		new Promise<PhotoEntry>((resolve, reject) => {
			running++;
			maxRunning = Math.max(maxRunning, running);
			pending.push({
				file,
				resolve: () => {
					running--;
					resolve(makeEntry(file.name));
				},
				reject: (error) => {
					running--;
					reject(error);
				}
			});
		});
	return { process, pending, getMaxRunning: () => maxRunning };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('processPhotoQueue', () => {
	it('verarbeitet Dateien nacheinander und nie mehr als eine gleichzeitig', async () => {
		const controlled = createControlledProcess();
		const entries: string[] = [];
		const done = processPhotoQueue([makeFile('a'), makeFile('b'), makeFile('c')], {
			process: controlled.process,
			onEntry: (entry) => {
				entries.push(entry.fileName);
			},
			onProgress: () => {}
		});

		await flush();
		expect(controlled.pending).toHaveLength(1);
		controlled.pending[0].resolve();
		await flush();
		expect(controlled.pending).toHaveLength(2);
		controlled.pending[1].resolve();
		await flush();
		controlled.pending[2].resolve();

		const result = await done;
		expect(entries).toEqual(['a', 'b', 'c']);
		expect(controlled.getMaxRunning()).toBe(1);
		expect(result.failed).toEqual([]);
	});

	it('wartet auf onEntry, bevor die nächste Datei startet', async () => {
		const controlled = createControlledProcess();
		let finishEntry: () => void = () => {};
		const onEntry = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishEntry = resolve;
				})
		);
		const done = processPhotoQueue([makeFile('a'), makeFile('b')], {
			process: controlled.process,
			onEntry,
			onProgress: () => {}
		});

		await flush();
		controlled.pending[0].resolve();
		await flush();
		expect(controlled.pending).toHaveLength(1);

		finishEntry();
		await flush();
		expect(controlled.pending).toHaveLength(2);
		controlled.pending[1].resolve();
		await flush();
		finishEntry();
		await done;
	});

	it('meldet den Fortschritt von 1 bis zur Gesamtzahl', async () => {
		const progress: PhotoQueueProgress[] = [];
		await processPhotoQueue([makeFile('a'), makeFile('b'), makeFile('c')], {
			process: async (file) => makeEntry(file.name),
			onEntry: () => {},
			onProgress: (value) => progress.push(value)
		});

		expect(progress).toEqual([
			{ current: 1, total: 3 },
			{ current: 2, total: 3 },
			{ current: 3, total: 3 }
		]);
	});

	it('sammelt erwartete Fehler und verarbeitet die übrigen Dateien weiter', async () => {
		const entries: string[] = [];
		const result = await processPhotoQueue([makeFile('a.heic'), makeFile('b.jpg')], {
			process: async (file) => {
				if (file.name === 'a.heic') throw new HeicConversionError('Konvertierung gescheitert');
				return makeEntry(file.name);
			},
			onEntry: (entry) => {
				entries.push(entry.fileName);
			},
			onProgress: () => {}
		});

		expect(entries).toEqual(['b.jpg']);
		expect(result.failed).toEqual([{ fileName: 'a.heic', message: 'Konvertierung gescheitert' }]);
	});

	it('wertet auch unerwartete Fehler als Fehlschlag der einen Datei mit allgemeiner Meldung', async () => {
		const entries: string[] = [];
		const result = await processPhotoQueue([makeFile('kaputt.jpg'), makeFile('ok.jpg')], {
			process: async (file) => {
				if (file.name === 'kaputt.jpg') throw new Error('createImageBitmap failed');
				return makeEntry(file.name);
			},
			onEntry: (entry) => {
				entries.push(entry.fileName);
			},
			onProgress: () => {}
		});

		expect(entries).toEqual(['ok.jpg']);
		expect(result.failed).toEqual([
			{ fileName: 'kaputt.jpg', message: 'Das Foto konnte nicht verarbeitet werden.' }
		]);
	});

	it('tut bei leerer Dateiliste nichts', async () => {
		const onProgress = vi.fn();
		const result = await processPhotoQueue([], {
			process: async (file) => makeEntry(file.name),
			onEntry: () => {},
			onProgress
		});

		expect(onProgress).not.toHaveBeenCalled();
		expect(result.failed).toEqual([]);
	});
});
