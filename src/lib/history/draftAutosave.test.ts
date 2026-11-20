import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftFormData } from './db';
import { createDraftAutosave } from './draftAutosave';

const makeSnapshot = (scrollY: number): DraftFormData => ({
	vehicles: [],
	photos: [],
	ui: { collapsedVehicleIds: [], scrollY, geocodeWarnings: {} }
});

const DELAY_MS = 800;

describe('createDraftAutosave', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('schreibt erst nach der Verzögerung', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		await vi.advanceTimersByTimeAsync(DELAY_MS - 1);
		expect(write).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(write).toHaveBeenCalledExactlyOnceWith(makeSnapshot(1));
	});

	it('fasst schnelle Änderungen zusammen und schreibt den letzten Stand', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		await vi.advanceTimersByTimeAsync(500);
		autosave.schedule(() => makeSnapshot(2));
		await vi.advanceTimersByTimeAsync(500);
		expect(write).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);
		expect(write).toHaveBeenCalledExactlyOnceWith(makeSnapshot(2));
	});

	it('schreibt einen null-Stand, damit der Entwurf gelöscht wird', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => null);
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		expect(write).toHaveBeenCalledExactlyOnceWith(null);
	});

	it('flush schreibt sofort und der Timer löst danach nicht erneut aus', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(3));
		await autosave.flush();
		expect(write).toHaveBeenCalledExactlyOnceWith(makeSnapshot(3));

		await vi.advanceTimersByTimeAsync(DELAY_MS * 2);
		expect(write).toHaveBeenCalledTimes(1);
	});

	it('flush ohne ausstehenden Stand schreibt nichts', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		await autosave.flush();
		expect(write).not.toHaveBeenCalled();
	});

	it('cancel verwirft den ausstehenden Stand', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		autosave.cancel();
		await vi.advanceTimersByTimeAsync(DELAY_MS * 2);
		await autosave.flush();
		expect(write).not.toHaveBeenCalled();
	});

	it('tut im deaktivierten Zustand nichts und verwirft ausstehende Stände', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		autosave.setEnabled(false);
		autosave.schedule(() => makeSnapshot(2));
		await autosave.flush();
		await vi.advanceTimersByTimeAsync(DELAY_MS * 2);
		expect(write).not.toHaveBeenCalled();
	});

	it('schreibt nach erneutem Aktivieren wieder', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.setEnabled(false);
		autosave.setEnabled(true);
		autosave.schedule(() => makeSnapshot(4));
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		expect(write).toHaveBeenCalledExactlyOnceWith(makeSnapshot(4));
	});

	it('wertet den Stand beim flush aus, nicht beim Planen', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });
		let scrollY = 1;

		autosave.schedule(() => makeSnapshot(scrollY));
		scrollY = 9;
		await autosave.flush();
		expect(write).toHaveBeenCalledExactlyOnceWith(makeSnapshot(9));
	});

	it('überlappt Schreibvorgänge nicht: der spätere Stand wird zuletzt gespeichert', async () => {
		const stored: (DraftFormData | null)[] = [];
		const releases: (() => void)[] = [];
		const write = vi.fn(
			(snapshot: DraftFormData | null) =>
				new Promise<void>((resolve) => {
					releases.push(() => {
						stored.push(snapshot);
						resolve();
					});
				})
		);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		const firstFlush = autosave.flush();
		autosave.schedule(() => makeSnapshot(2));
		const secondFlush = autosave.flush();
		await vi.advanceTimersByTimeAsync(0);

		// Der zweite Schreibvorgang wartet auf den ersten.
		expect(write).toHaveBeenCalledTimes(1);
		releases[0]();
		await firstFlush;
		await vi.advanceTimersByTimeAsync(0);
		expect(write).toHaveBeenCalledTimes(2);
		releases[1]();
		await secondFlush;

		expect(stored).toEqual([makeSnapshot(1), makeSnapshot(2)]);
	});

	it('schreibt nach einem fehlgeschlagenen Schreibvorgang weiter und meldet den Fehler', async () => {
		const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const write = vi
			.fn()
			.mockRejectedValueOnce(new Error('Speicher voll'))
			.mockResolvedValue(undefined);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		await autosave.flush();
		autosave.schedule(() => makeSnapshot(2));
		await autosave.flush();

		expect(write).toHaveBeenCalledTimes(2);
		expect(logError).toHaveBeenCalled();
		logError.mockRestore();
	});

	it('whenIdle wartet auf laufende Schreibvorgänge', async () => {
		let release: () => void = () => {};
		const write = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		const autosave = createDraftAutosave({ delayMs: DELAY_MS, write });

		autosave.schedule(() => makeSnapshot(1));
		void autosave.flush();
		let idle = false;
		void autosave.whenIdle().then(() => (idle = true));
		await vi.advanceTimersByTimeAsync(0);
		expect(idle).toBe(false);

		release();
		await vi.advanceTimersByTimeAsync(0);
		expect(idle).toBe(true);
	});
});
