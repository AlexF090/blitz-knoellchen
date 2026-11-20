import { afterEach, describe, expect, it } from 'vitest';
import {
	createVercelAnalytics,
	injectVercelAnalytics,
	trackPageview,
	VERCEL_ANALYTICS_SCRIPT_SRC
} from './vercelAnalytics';

const analyticsScripts = () =>
	document.head.querySelectorAll<HTMLScriptElement>(`script[src="${VERCEL_ANALYTICS_SCRIPT_SRC}"]`);

afterEach(() => {
	for (const script of analyticsScripts()) script.remove();
	delete window.va;
	delete window.vaq;
});

describe('injectVercelAnalytics', () => {
	it('lädt das Skript einmalig, verzögert und ohne automatische Seitenzählung', () => {
		injectVercelAnalytics();
		injectVercelAnalytics();

		const scripts = analyticsScripts();
		expect(scripts).toHaveLength(1);
		const [script] = scripts;
		expect(script.defer).toBe(true);
		expect(script.dataset.disableAutoTrack).toBe('1');
	});

	it('sammelt Befehle in der Queue, bis das Skript geladen ist', () => {
		injectVercelAnalytics();

		trackPageview('/historie', '/historie');

		expect(window.vaq).toEqual([['pageview', { route: '/historie', path: '/historie' }]]);
	});

	it('übernimmt eine schon vorhandene Befehlsschnittstelle', () => {
		const calls: unknown[][] = [];
		window.va = (...parameters: unknown[]) => calls.push(parameters);

		injectVercelAnalytics();
		trackPageview('/', '/');

		expect(calls).toEqual([['pageview', { route: '/', path: '/' }]]);
		expect(window.vaq).toBeUndefined();
	});
});

describe('createVercelAnalytics', () => {
	it('lädt ausgeschaltet nichts und meldet nichts', () => {
		const track = createVercelAnalytics(false);

		track('/', '/');

		expect(analyticsScripts()).toHaveLength(0);
		expect(window.va).toBeUndefined();
	});

	it('lädt eingeschaltet das Skript und meldet Seitenaufrufe mit Route-Muster', () => {
		const track = createVercelAnalytics(true);

		track('/historie', '/historie');
		track(null, '/gibt-es-nicht');

		expect(analyticsScripts()).toHaveLength(1);
		expect(window.vaq).toEqual([['pageview', { route: '/historie', path: '/historie' }]]);
	});
});

describe('trackPageview', () => {
	it('tut ohne eingebundenes Analytics nichts', () => {
		expect(() => trackPageview('/', '/')).not.toThrow();
	});
});
