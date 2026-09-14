import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadWithLatestVersion } from './reloadLatest';

if (typeof navigator === 'undefined') {
	Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
}

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

afterEach(() => {
	if (originalServiceWorker) {
		Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
	} else {
		Reflect.deleteProperty(navigator, 'serviceWorker');
	}
});

describe('reloadWithLatestVersion', () => {
	it('stößt einen Service-Worker-Update-Check an und lädt danach neu', async () => {
		const reload = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'serviceWorker', {
			value: { getRegistration: vi.fn().mockResolvedValue({ update }) },
			configurable: true
		});

		await reloadWithLatestVersion(reload);

		expect(update).toHaveBeenCalledOnce();
		expect(reload).toHaveBeenCalledOnce();
	});

	it('lädt trotzdem neu, wenn kein Service Worker registriert ist', async () => {
		const reload = vi.fn();
		Object.defineProperty(navigator, 'serviceWorker', {
			value: { getRegistration: vi.fn().mockResolvedValue(undefined) },
			configurable: true
		});

		await reloadWithLatestVersion(reload);

		expect(reload).toHaveBeenCalledOnce();
	});

	it('lädt trotzdem neu, wenn der Update-Check fehlschlägt (z.B. offline)', async () => {
		const reload = vi.fn();
		const update = vi.fn().mockRejectedValue(new Error('offline'));
		Object.defineProperty(navigator, 'serviceWorker', {
			value: { getRegistration: vi.fn().mockResolvedValue({ update }) },
			configurable: true
		});

		await reloadWithLatestVersion(reload);

		expect(reload).toHaveBeenCalledOnce();
	});
});
