import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appMode } from './appMode.svelte';

beforeEach(() => {
	sessionStorage.clear();
	appMode.reset();
});

afterEach(() => {
	sessionStorage.clear();
	appMode.reset();
	vi.restoreAllMocks();
});

describe('appMode', () => {
	it('startet im Live-Modus ohne offenen Auswahldialog', () => {
		expect(appMode.current).toBe('live');
		expect(appMode.isChangeRequested).toBe(false);
	});

	it('setzt den Modus und persistiert ihn in sessionStorage', () => {
		appMode.set('demo');
		expect(appMode.current).toBe('demo');
		expect(sessionStorage.getItem('blitz-knoellchen:app-mode')).toBe('demo');
	});

	it('stellt einen zuvor gespeicherten Modus wieder her', () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'demo');
		appMode.restore();
		expect(appMode.current).toBe('demo');
	});

	it('meldet den Modus erst nach restore als geladen', () => {
		expect(appMode.isRestored).toBe(false);
		appMode.restore();
		expect(appMode.isRestored).toBe(true);
	});

	it('ignoriert einen ungültigen gespeicherten Wert beim Wiederherstellen', () => {
		sessionStorage.setItem('blitz-knoellchen:app-mode', 'invalid-value');
		appMode.restore();
		expect(appMode.current).toBe('live');
	});

	it('öffnet den Auswahldialog per requestChange, ohne den Modus zu ändern', () => {
		appMode.set('demo');
		appMode.requestChange();
		expect(appMode.isChangeRequested).toBe(true);
		expect(appMode.current).toBe('demo');
	});

	it('schließt den Auswahldialog per cancelChange, ohne den Modus zu ändern', () => {
		appMode.requestChange();
		appMode.cancelChange();
		expect(appMode.isChangeRequested).toBe(false);
		expect(appMode.current).toBe('live');
	});

	it('schließt den Auswahldialog, sobald ein Modus gesetzt wird', () => {
		appMode.requestChange();
		appMode.set('demo');
		expect(appMode.isChangeRequested).toBe(false);
	});

	it('wirft nicht, wenn sessionStorage.setItem fehlschlägt (z.B. Safari Private Mode/Quota)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('QuotaExceededError');
		});

		expect(() => appMode.set('demo')).not.toThrow();
		expect(appMode.current).toBe('demo');
	});
});
