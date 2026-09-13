import type { Page } from '@playwright/test';

export const chooseAppMode = async (page: Page, mode: 'demo' | 'live' = 'demo') => {
	await page
		.getByRole('dialog', { name: 'Demo- oder Live-Modus?' })
		.getByRole('button', { name: mode === 'demo' ? 'Demo verwenden' : 'Live verwenden' })
		.click();
};
