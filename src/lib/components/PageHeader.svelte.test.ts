import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { appMode } from '$lib/appMode.svelte';
import PageHeader from './PageHeader.svelte';

afterEach(() => {
	appMode.requestChange();
	sessionStorage.clear();
});

describe('PageHeader', () => {
	it('rendert einen Home-Link zur Startseite', async () => {
		await render(PageHeader, { linkHref: '/historie', linkLabel: 'Historie', linkIcon: 'history' });

		const homeLink = page.getByRole('link', { name: 'Zur Startseite' });
		await expect.element(homeLink).toBeInTheDocument();
		await expect.element(homeLink).toHaveAttribute('href', '/');
	});

	it('zeigt kein Modus-Badge, wenn appMode.current null ist', async () => {
		await render(PageHeader, { linkHref: '/historie', linkLabel: 'Historie', linkIcon: 'history' });

		expect(page.getByRole('button', { name: /Modus wechseln/ }).elements()).toHaveLength(0);
	});

	it('zeigt das Modus-Badge im Demo-Modus und ruft appMode.requestChange() beim Klick auf', async () => {
		appMode.set('demo');
		await render(PageHeader, { linkHref: '/historie', linkLabel: 'Historie', linkIcon: 'history' });

		const badge = page.getByRole('button', { name: 'Modus wechseln (aktuell Demo)' });
		await expect.element(badge).toBeInTheDocument();
		await expect.element(badge).toHaveTextContent('Demo');

		await userEvent.click(badge);

		expect(appMode.current).toBeNull();
	});

	it('zeigt das Modus-Badge im Live-Modus mit entsprechendem Label', async () => {
		appMode.set('live');
		await render(PageHeader, { linkHref: '/historie', linkLabel: 'Historie', linkIcon: 'history' });

		const badge = page.getByRole('button', { name: 'Modus wechseln (aktuell Live)' });
		await expect.element(badge).toBeInTheDocument();
		await expect.element(badge).toHaveTextContent('Live');
	});

	it('rendert das History-Icon-Link mit korrektem Label, wenn linkIcon="history"', async () => {
		await render(PageHeader, { linkHref: '/historie', linkLabel: 'Historie', linkIcon: 'history' });

		const link = page.getByRole('link', { name: 'Historie' });
		await expect.element(link).toBeInTheDocument();
		await expect.element(link).toHaveAttribute('href', '/historie');
	});

	it('rendert das Zurück-Icon-Link, wenn linkIcon="back"', async () => {
		await render(PageHeader, { linkHref: '/', linkLabel: 'Zurück', linkIcon: 'back' });

		const link = page.getByRole('link', { name: 'Zurück' });
		await expect.element(link).toBeInTheDocument();
	});
});
