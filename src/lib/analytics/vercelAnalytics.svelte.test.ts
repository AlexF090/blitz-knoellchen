import { describe, expect, it } from 'vitest';
import {
	createVercelAnalytics,
	injectVercelAnalytics,
	trackPageview,
	VERCEL_ANALYTICS_SCRIPT_SRC,
	type AnalyticsHost
} from './vercelAnalytics';

// Ein losgelöstes Dokument lädt eingefügte Skripte nicht: Die Tests lösen so keine echte Anfrage
// an /_vercel/insights aus.
const createHost = (): AnalyticsHost => ({
	document: document.implementation.createHTMLDocument('Analytics-Test')
});

const analyticsScripts = (host: AnalyticsHost) =>
	host.document.head.querySelectorAll<HTMLScriptElement>(
		`script[src="${VERCEL_ANALYTICS_SCRIPT_SRC}"]`
	);

describe('injectVercelAnalytics', () => {
	it('lädt das Skript einmalig, verzögert und ohne automatische Seitenzählung', () => {
		const host = createHost();

		injectVercelAnalytics(host);
		injectVercelAnalytics(host);

		const scripts = analyticsScripts(host);
		expect(scripts).toHaveLength(1);
		const [script] = scripts;
		expect(script.defer).toBe(true);
		expect(script.dataset.disableAutoTrack).toBe('1');
	});

	it('sammelt Befehle in der Queue, bis das Skript geladen ist', () => {
		const host = createHost();

		injectVercelAnalytics(host);
		trackPageview('/historie', '/historie', host);

		expect(host.vaq).toEqual([['pageview', { route: '/historie', path: '/historie' }]]);
	});

	it('übernimmt eine schon vorhandene Befehlsschnittstelle', () => {
		const calls: unknown[][] = [];
		const host: AnalyticsHost = {
			...createHost(),
			va: (...parameters: unknown[]) => calls.push(parameters)
		};

		injectVercelAnalytics(host);
		trackPageview('/', '/', host);

		expect(calls).toEqual([['pageview', { route: '/', path: '/' }]]);
		expect(host.vaq).toBeUndefined();
	});
});

describe('createVercelAnalytics', () => {
	it('lädt ausgeschaltet nichts und meldet nichts', () => {
		const host = createHost();

		createVercelAnalytics(false, host)('/', '/');

		expect(analyticsScripts(host)).toHaveLength(0);
		expect(host.va).toBeUndefined();
	});

	it('lädt eingeschaltet das Skript und meldet Seitenaufrufe mit Route-Muster', () => {
		const host = createHost();
		const track = createVercelAnalytics(true, host);

		track('/historie', '/historie');
		track(null, '/gibt-es-nicht');

		expect(analyticsScripts(host)).toHaveLength(1);
		expect(host.vaq).toEqual([['pageview', { route: '/historie', path: '/historie' }]]);
	});
});

describe('trackPageview', () => {
	it('tut ohne eingebundenes Analytics nichts', () => {
		expect(() => trackPageview('/', '/', createHost())).not.toThrow();
	});
});
