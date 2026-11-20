import type { DraftFormData } from './db';

/** Ruhezeit des Formular-Autosaves. */
// Kurz genug, dass ein Schließen des Tabs kaum Eingaben kostet, lang genug, dass nicht jeder
// Tastendruck die IndexedDB beschreibt.
export const DRAFT_AUTOSAVE_DELAY_MS = 800;

interface DraftAutosaveOptions {
	/** Ruhezeit nach der letzten Änderung, bevor geschrieben wird. */
	delayMs: number;
	/** Speichert den Stand; `null` bedeutet „Formular leer“ und löscht den Entwurf. */
	write: (snapshot: DraftFormData | null) => Promise<void>;
}

export interface DraftAutosave {
	/** Merkt den Stand vor und schreibt ihn nach der Ruhezeit; spätere Aufrufe ersetzen ihn. */
	schedule: (getSnapshot: () => DraftFormData | null) => void;
	/** Schreibt den vorgemerkten Stand sofort; ohne vorgemerkten Stand passiert nichts. */
	flush: () => Promise<void>;
	/** Verwirft den vorgemerkten Stand. Bereits laufende Schreibvorgänge laufen weiter. */
	cancel: () => void;
	/** Schaltet das Speichern an oder aus; beim Ausschalten fällt der vorgemerkte Stand weg. */
	setEnabled: (enabled: boolean) => void;
	/** Erfüllt sich, sobald alle bisher gestarteten Schreibvorgänge beendet sind. */
	whenIdle: () => Promise<void>;
}

/** Entprellt das Speichern des Entwurfs und stellt sicher, dass Schreibvorgänge nacheinander laufen. */
export const createDraftAutosave = ({ delayMs, write }: DraftAutosaveOptions): DraftAutosave => {
	let enabled = true;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: (() => DraftFormData | null) | undefined;
	// Jeder Schreibvorgang hängt an der Kette, sonst könnte ein langsamer älterer Stand einen
	// neueren überschreiben.
	let chain: Promise<void> = Promise.resolve();

	const stopTimer = () => {
		clearTimeout(timer);
		timer = undefined;
	};

	const flush = (): Promise<void> => {
		stopTimer();
		if (!enabled || !pending) return chain;

		// Der Stand wird jetzt gelesen, nicht erst in der Kette: Beim Schließen des Tabs zählt der
		// Zustand zu diesem Zeitpunkt.
		const snapshot = pending();
		pending = undefined;
		chain = chain
			.then(() => write(snapshot))
			.catch((error: unknown) => {
				// Ein Fehler darf die folgenden Schreibvorgänge nicht blockieren.
				console.error('Fehler beim Speichern des Entwurfs:', error);
			});
		return chain;
	};

	return {
		schedule(getSnapshot) {
			if (!enabled) return;
			pending = getSnapshot;
			stopTimer();
			timer = setTimeout(() => void flush(), delayMs);
		},
		flush,
		cancel() {
			stopTimer();
			pending = undefined;
		},
		setEnabled(nextEnabled) {
			enabled = nextEnabled;
			if (nextEnabled) return;
			stopTimer();
			pending = undefined;
		},
		whenIdle: () => chain
	};
};
