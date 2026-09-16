import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appMode } from './appMode.svelte';

beforeEach(() => {
	sessionStorage.clear();
	appMode.requestChange();
});

afterEach(() => {
	sessionStorage.clear();
	appMode.requestChange();
	vi.restoreAllMocks();
});

describe('appMode', () => {
	it('startet ohne gewählten Modus', () => {
		expect(appMode.current).toBeNull();
	});

	it('setzt den Modus und persistiert ihn in sessionStorage', () => {
		appMode.set('demo');
		expect(appMode.current).toBe('demo');
		expect(sessionStorage.getItem('blitz-knoellchen:app-mode')).toBe('demo');
	});

	it('stellt einen zuvor gespeicherten Modus wieder her', () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'live');
		appMode.restore();
		expect(appMode.current).toBe('live');
	});

	it('ignoriert einen ungültigen gespeicherten Wert beim Wiederherstellen', () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'invalid-value');
		appMode.restore();
		expect(appMode.current).toBeNull();
	});

	it('setzt den Modus per requestChange zurück, ohne den gespeicherten Wert zu verwerfen', () => {
		appMode.set('demo');
		appMode.requestChange();
		expect(appMode.current).toBeNull();
		expect(sessionStorage.getItem('blitz-knoellchen:app-mode')).toBe('demo');
	});

	it('wirft nicht, wenn sessionStorage.setItem fehlschlägt (z.B. Safari Private Mode/Quota)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('QuotaExceededError');
		});

		expect(() => appMode.set('demo')).not.toThrow();
		expect(appMode.current).toBe('demo');
	});
});
