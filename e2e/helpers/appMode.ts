import type { Page } from '@playwright/test';

/** Wechselt über das Modus-Badge im Header; die App startet ohne Rückfrage im Live-Modus. */
export const chooseAppMode = async (page: Page, mode: 'demo' | 'live' = 'demo') => {
	await page.getByRole('button', { name: /^Modus wechseln/ }).click();
	await page
		.getByRole('dialog', { name: 'Live- oder Demo-Modus?' })
		.getByRole('button', { name: mode === 'demo' ? 'Demo verwenden' : 'Live verwenden' })
		.click();
};
