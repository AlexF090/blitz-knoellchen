import { describe, expect, it, vi } from 'vitest';
import { registerSW } from 'virtual:pwa-register';
import { init } from './hooks.client';

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }));

describe('init', () => {
	it('registriert den Service Worker sofort und ohne automatischen Reload', async () => {
		await init();

		expect(registerSW).toHaveBeenCalledTimes(1);
		const [options] = vi.mocked(registerSW).mock.calls[0];
		expect(options?.immediate).toBe(true);
		expect(options?.onNeedReload?.()).toBeUndefined();
	});
});
