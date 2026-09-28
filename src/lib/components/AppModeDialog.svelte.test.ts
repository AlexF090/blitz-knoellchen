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

// Offene Dialoge vor dem Reset schließen und auf ihr close-Event warten: Sonst entfernt erst der
// Cleanup des nächsten Tests den Dialog, das dann gefeuerte close-Event ruft cancelChange() auf
// und setzt einen dort gerade angeforderten Wechsel zurück.
afterEach(async () => {
	const openDialogs = [...document.querySelectorAll('dialog')].filter((dialog) => dialog.open);
	await Promise.all(
		openDialogs.map(
			(dialog) =>
				new Promise((resolve) => {
					dialog.addEventListener('close', resolve, { once: true });
					dialog.close();
				})
		)
	);
	appMode.reset();
	sessionStorage.clear();
});

const renderDialog = async () => {
	const { container } = await render(AppModeDialog);
	return container.querySelector('dialog') as HTMLDialogElement;
};

describe('AppModeDialog', () => {
	it('bleibt beim Start geschlossen, die App läuft im Live-Modus', async () => {
		const dialog = await renderDialog();

		expect(dialog.open).toBe(false);
		expect(appMode.current).toBe('live');
	});

	it('öffnet sich, wenn ein Moduswechsel angefordert wird', async () => {
		const dialog = await renderDialog();

		appMode.requestChange();

		await vi.waitFor(() => expect(dialog.open).toBe(true));
		await expect.element(page.getByText('Live- oder Demo-Modus?')).toBeInTheDocument();
	});

	it('nutzt den Leerstring-Fallback in den Action-Button-Klassen bei fehlenden Style-Konstanten', async () => {
		await renderDialog();

		const demoButton = page.getByRole('button', { name: 'Demo verwenden', includeHidden: true });
		const liveButton = page.getByRole('button', { name: 'Live verwenden', includeHidden: true });

		expect(demoButton.element().className).not.toContain('undefined');
		expect(liveButton.element().className).not.toContain('undefined');
	});

	it('setzt den Demo-Modus und schließt den Dialog bei Klick auf "Demo verwenden"', async () => {
		const dialog = await renderDialog();
		appMode.requestChange();
		await vi.waitFor(() => expect(dialog.open).toBe(true));

		await userEvent.click(page.getByRole('button', { name: 'Demo verwenden' }));

		expect(appMode.current).toBe('demo');
		await vi.waitFor(() => expect(dialog.open).toBe(false));
	});

	it('setzt den Live-Modus und schließt den Dialog bei Klick auf "Live verwenden"', async () => {
		appMode.set('demo');
		const dialog = await renderDialog();
		appMode.requestChange();
		await vi.waitFor(() => expect(dialog.open).toBe(true));

		await userEvent.click(page.getByRole('button', { name: 'Live verwenden' }));

		expect(appMode.current).toBe('live');
		await vi.waitFor(() => expect(dialog.open).toBe(false));
	});

	it('lässt sich per Backdrop-Klick schließen, ohne den Modus zu ändern', async () => {
		const dialog = await renderDialog();
		appMode.requestChange();
		await vi.waitFor(() => expect(dialog.open).toBe(true));

		dialog.click();

		await vi.waitFor(() => expect(appMode.isChangeRequested).toBe(false));
		expect(dialog.open).toBe(false);
		expect(appMode.current).toBe('live');
	});

	it('lädt beim Mount einen gespeicherten Modus aus sessionStorage', async () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'demo');

		const dialog = await renderDialog();

		expect(appMode.current).toBe('demo');
		expect(dialog.open).toBe(false);
	});
});
