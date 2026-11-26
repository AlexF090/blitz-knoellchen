import { describe, expect, it } from 'vitest';
import { GET, prerender } from './+server.ts';

describe('GET /sitemap.xml', () => {
	it('wird vorgerendert', () => {
		expect(prerender).toBe(true);
	});

	it('liefert XML mit passendem Content-Type', async () => {
		const response = GET();

		expect(response.headers.get('content-type')).toBe('application/xml');
		expect(await response.text()).toContain('<loc>https://blitz-knoellchen.appool.de/faq</loc>');
	});
});
