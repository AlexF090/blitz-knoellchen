import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { appMode } from '$lib/appMode.svelte';
import AppModeDialog from './AppModeDialog.svelte';

// buttonPrimary/buttonDestructiveSecondary sind Modul-Konstanten (immer definierte Strings) —
// Svelte kompiliert die abgeleiteten class-Attribute dennoch mit einem `?? ''`-Fallback. Nur ein
// zur Laufzeit fehlender Wert (hier per Mock erzwungen) deckt diesen Fallback-Zweig ab.
vi.mock('$lib/ui/buttonStyles', () => ({
	buttonPrimary: undefined,
	buttonDestructiveSecondary: undefined
}));

afterEach(() => {
	appMode.requestChange();
	sessionStorage.clear();
});

describe('AppModeDialog', () => {
	it('öffnet sich automatisch, wenn noch kein Modus gesetzt ist', async () => {
		await render(AppModeDialog);

		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		await expect.element(page.getByText('Demo- oder Live-Modus?')).toBeInTheDocument();
		expect(dialog.open).toBe(true);
	});

	it('nutzt den Leerstring-Fallback in den Action-Button-Klassen bei fehlenden Style-Konstanten', async () => {
		await render(AppModeDialog);

		const demoButton = page.getByRole('button', { name: 'Demo verwenden' }).element();
		const liveButton = page.getByRole('button', { name: 'Live verwenden' }).element();

		expect(demoButton.className).not.toContain('undefined');
		expect(liveButton.className).not.toContain('undefined');
	});

	it('setzt den Demo-Modus und schließt den Dialog bei Klick auf "Demo verwenden"', async () => {
		await render(AppModeDialog);

		await userEvent.click(page.getByRole('button', { name: 'Demo verwenden' }));

		expect(appMode.current).toBe('demo');
		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(false);
	});

	it('setzt den Live-Modus und schließt den Dialog bei Klick auf "Live verwenden"', async () => {
		await render(AppModeDialog);

		await userEvent.click(page.getByRole('button', { name: 'Live verwenden' }));

		expect(appMode.current).toBe('live');
		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(false);
	});

	it('ist nicht per Escape schließbar (dismissable=false)', async () => {
		await render(AppModeDialog);

		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(true);

		const cancelEvent = new Event('cancel', { cancelable: true });
		dialog.dispatchEvent(cancelEvent);

		expect(cancelEvent.defaultPrevented).toBe(true);
		expect(dialog.open).toBe(true);
	});

	it('ist nicht per Backdrop-Klick schließbar (dismissable=false)', async () => {
		await render(AppModeDialog);

		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(true);

		dialog.click();

		expect(dialog.open).toBe(true);
	});

	it('lädt beim Mount einen gespeicherten Modus aus sessionStorage und öffnet den Dialog dann nicht', async () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'live');

		await render(AppModeDialog);

		// Das <dialog>-Element ist immer im DOM (ConfirmDialog rendert es unbedingt) — nur der
		// native "open"-Zustand entscheidet über die Sichtbarkeit, daher hier statt Text-Absenz
		// geprüft.
		const dialog = document.querySelector('dialog') as HTMLDialogElement;
		await vi.waitFor(() => expect(dialog.open).toBe(false));
		expect(appMode.current).toBe('live');
	});
});
