import type { PhotoEntry } from '$lib/validation/formSchema';
import { HeicConversionError } from './createPhotoEntry';

/** Stand der Verarbeitung: `current` ist die laufende Datei (ab 1), `total` die Gesamtzahl. */
export interface PhotoQueueProgress {
	current: number;
	total: number;
}

/** Eine Datei, die sich nicht verarbeiten ließ, samt nutzerlesbarer Meldung. */
export interface PhotoQueueFailure {
	fileName: string;
	message: string;
}

interface PhotoQueueOptions {
	process: (file: File) => Promise<PhotoEntry>;
	/** Wird nach jeder erfolgreich verarbeiteten Datei aufgerufen und abgewartet. */
	onEntry: (entry: PhotoEntry) => Promise<void> | void;
	onProgress: (progress: PhotoQueueProgress) => void;
	/** Bricht die Warteschlange ab: Das laufende Foto wird verworfen, weitere starten nicht. */
	signal?: AbortSignal;
}

const UNEXPECTED_FAILURE_MESSAGE = 'Das Foto konnte nicht verarbeitet werden.';

/**
 * Verarbeitet Fotos strikt nacheinander und meldet Fortschritt und Fehlschläge. Fehlgeschlagene
 * Dateien landen in `failed`, die Warteschlange läuft weiter.
 * Nach einem Abbruch über `signal` erreichen weder Fortschritt noch Einträge den Aufrufer.
 */
export const processPhotoQueue = async (
	files: File[],
	{ process, onEntry, onProgress, signal }: PhotoQueueOptions
): Promise<{ failed: PhotoQueueFailure[] }> => {
	const failed: PhotoQueueFailure[] = [];

	// Nacheinander statt parallel: Das Dekodieren eines 12-MP-Fotos auf der Canvas belegt rund
	// 48 MB, mehrere gleichzeitig würden Smartphones in den Speichermangel treiben.
	for (const [index, file] of files.entries()) {
		if (signal?.aborted) break;
		onProgress({ current: index + 1, total: files.length });

		try {
			const entry = await process(file);
			// Der Aufrufer hat die Warteschlange inzwischen verworfen (z.B. Formular zurückgesetzt):
			// Das Foto gehört zu einem Stand, den es nicht mehr gibt.
			if (signal?.aborted) break;
			await onEntry(entry);
		} catch (error) {
			// Auch unerwartete Fehler betreffen nur diese Datei: Eine kaputte Datei darf die bereits
			// ausgewählten übrigen Fotos nicht verwerfen, sonst müsste der Nutzer alle neu wählen.
			if (!(error instanceof HeicConversionError)) {
				console.error(`Fehler beim Verarbeiten des Fotos „${file.name}“:`, error);
			}
			failed.push({
				fileName: file.name,
				message: error instanceof HeicConversionError ? error.message : UNEXPECTED_FAILURE_MESSAGE
			});
		}
	}

	return { failed };
};
