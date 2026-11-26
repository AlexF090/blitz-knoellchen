import { describe, expect, it } from 'vitest';
import { applyIndexingPolicy } from './applyIndexingPolicy.ts';

describe('applyIndexingPolicy', () => {
	it('lässt Produktion indexierbar', () => {
		const headers = new Headers();

		applyIndexingPolicy(headers, 'production');

		expect(headers.has('X-Robots-Tag')).toBe(false);
	});

	it.each(['preview', 'development', undefined])(
		'sperrt die Indexierung bei VERCEL_ENV=%s',
		(environment) => {
			const headers = new Headers();

			applyIndexingPolicy(headers, environment);

			expect(headers.get('X-Robots-Tag')).toBe('noindex');
		}
	);
});
