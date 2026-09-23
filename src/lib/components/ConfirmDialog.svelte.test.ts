import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

const textSnippet = (text: string) =>
	createRawSnippet(() => ({
		render: () => `<p>${text}</p>`
	}));

describe('ConfirmDialog', () => {
	it('rendert title, titleId und actions-Snippet', async () => {
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 'my-title',
			title: 'Wirklich löschen?',
			children: textSnippet('Inhalt'),
			actions: textSnippet('Aktionen')
		});

		const heading = page.getByText('Wirklich löschen?');
		await expect.element(heading).toBeInTheDocument();
		await expect.element(heading).toHaveAttribute('id', 'my-title');
		await expect.element(page.getByText('Inhalt')).toBeInTheDocument();
		await expect.element(page.getByText('Aktionen')).toBeInTheDocument();
	});

	it('schließt NICHT per Escape, wenn dismissable=false ist', async () => {
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 't',
			title: 'Titel',
			dismissable: false,
			children: textSnippet('Inhalt'),
			actions: textSnippet('Aktionen')
		});

		const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
		dialogEl.showModal();
		expect(dialogEl.open).toBe(true);

		const cancelEvent = new Event('cancel', { cancelable: true });
		dialogEl.dispatchEvent(cancelEvent);

		expect(cancelEvent.defaultPrevented).toBe(true);
	});

	it('erlaubt Schließen per Escape, wenn dismissable=true ist', async () => {
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 't',
			title: 'Titel',
			dismissable: true,
			children: textSnippet('Inhalt'),
			actions: textSnippet('Aktionen')
		});

		const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
		dialogEl.showModal();

		const cancelEvent = new Event('cancel', { cancelable: true });
		dialogEl.dispatchEvent(cancelEvent);

		expect(cancelEvent.defaultPrevented).toBe(false);
	});

	it('schließt bei Backdrop-Klick, wenn dismissable=true ist', async () => {
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 't',
			title: 'Titel',
			dismissable: true,
			children: textSnippet('Inhalt'),
			actions: textSnippet('Aktionen')
		});

		const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
		dialogEl.showModal();
		expect(dialogEl.open).toBe(true);

		// Klick direkt auf das <dialog>-Element (nicht auf einen Nachfahren) simuliert einen
		// Backdrop-Klick — im echten Browser landet ein Klick auf den Backdrop-Rand ebenfalls mit
		// event.target === dialog.
		dialogEl.click();

		expect(dialogEl.open).toBe(false);
	});

	it('schließt NICHT bei Klick auf den Dialog-Inhalt selbst', async () => {
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 't',
			title: 'Titel',
			dismissable: true,
			children: textSnippet('Inhalt hier'),
			actions: textSnippet('Aktionen')
		});

		const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
		dialogEl.showModal();

		await userEvent.click(page.getByText('Inhalt hier'));

		expect(dialogEl.open).toBe(true);
	});

	it('nutzt den Leerstring-Fallback für die class, wenn desktopMaxWidthClass zur Laufzeit fehlt', async () => {
		// desktopMaxWidthClass hat einen Default-Wert, der nur bei `undefined` greift — `null`
		// umgeht das Svelte-Default-Handling und deckt so den `?? ''`-Fallback im kompilierten
		// class-Attribut ab.
		await render(ConfirmDialog, {
			dialog: undefined,
			titleId: 't',
			title: 'Titel',
			desktopMaxWidthClass: null as unknown as string,
			children: textSnippet('Inhalt'),
			actions: textSnippet('Aktionen')
		});

		const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
		expect(dialogEl.className).not.toContain('sm:max-w-sm');
		expect(dialogEl.className).not.toContain('null');
	});
});
