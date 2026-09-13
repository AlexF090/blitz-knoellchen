export type AppMode = 'demo' | 'live';

const STORAGE_KEY = 'blitz-knoellchen:app-mode';

const isAppMode = (value: unknown): value is AppMode => value === 'demo' || value === 'live';

let mode = $state<AppMode | null>(null);

export const appMode = {
	get current() {
		return mode;
	},
	set(value: AppMode) {
		mode = value;
		sessionStorage.setItem(STORAGE_KEY, value);
	},
	// Nur clientseitig aus einem $effect heraus aufrufen (nie am Modul-Top-Level) — sonst
	// schlägt der Zugriff auf sessionStorage während SSR fehl.
	restore() {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (isAppMode(stored)) mode = stored;
	},
	// Öffnet den Auswahldialog erneut (z.B. per Klick auf das Modus-Badge im Header), ohne den
	// zuletzt gespeicherten Wert aus sessionStorage zu verwerfen.
	requestChange() {
		mode = null;
	}
};
