import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '#lib/site.ts';
import { applyIndexingPolicy } from './applyIndexingPolicy.ts';

describe('applyIndexingPolicy', () => {
	it('lässt die Produktionsdomain indexierbar', () => {
		const headers = new Headers();

		applyIndexingPolicy(headers, SITE_ORIGIN);

		expect(headers.has('X-Robots-Tag')).toBe(false);
	});

	it.each([
		'https://blitz-knoellchen.example-account.workers.dev',
		'https://0123abcd-blitz-knoellchen.example-account.workers.dev',
		'http://localhost:4173',
		'http://blitz-knoellchen.appool.de',
		'https://www.blitz-knoellchen.appool.de'
	])('sperrt die Indexierung für %s', (origin) => {
		const headers = new Headers();

		applyIndexingPolicy(headers, origin);

		expect(headers.get('X-Robots-Tag')).toBe('noindex');
	});
});
