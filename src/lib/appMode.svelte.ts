/** Demo-Modus sendet an die Test-Adresse, Live-Modus an die echte Bußgeldstelle. */
export type AppMode = 'demo' | 'live';

const STORAGE_KEY = 'blitz-knoellchen:app-mode';

const isAppMode = (value: unknown): value is AppMode => value === 'demo' || value === 'live';

let mode = $state<AppMode>('live');
let isChangeRequested = $state(false);
let isRestored = $state(false);

/** Reaktiver Betriebsmodus der App, über sessionStorage hinweg persistiert. */
export const appMode = {
	get current() {
		return mode;
	},
	/**
	 * Ob der Modus aus sessionStorage geladen ist. Vorher (SSR, vor der Hydration) steht
	 * `current` nur vorläufig auf `'live'`, und ein Wechsel ließe sich noch nicht auslösen.
	 */
	get isRestored() {
		return isRestored;
	},
	/** Ob der Auswahldialog gerade offen sein soll. */
	get isChangeRequested() {
		return isChangeRequested;
	},
	set(value: AppMode) {
		mode = value;
		isChangeRequested = false;
		try {
			sessionStorage.setItem(STORAGE_KEY, value);
		} catch {
			// Safari Private Mode (ältere Versionen) oder erreichtes Storage-Quota kann hier
			// werfen — der In-Memory-State bleibt für die laufende Session gültig, nur die
			// Persistenz über Reloads hinweg entfällt. Kein Rethrow, erwarteter Edge-Case.
		}
	},
	/**
	 * Lädt den zuletzt gewählten Modus aus sessionStorage. Nur clientseitig aus einem `$effect`
	 * heraus aufrufen (nie am Modul-Top-Level) — sonst schlägt der Zugriff während SSR fehl.
	 */
	restore() {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (isAppMode(stored)) mode = stored;
		isRestored = true;
	},
	/** Öffnet den Auswahldialog (z.B. per Klick auf das Modus-Badge im Header). */
	requestChange() {
		isChangeRequested = true;
	},
	/** Schließt den Auswahldialog, ohne den Modus zu ändern. */
	cancelChange() {
		isChangeRequested = false;
	},
	/** Setzt den Standardzustand wieder her, ohne sessionStorage anzufassen (für Tests). */
	reset() {
		mode = 'live';
		isChangeRequested = false;
		isRestored = false;
	}
};
