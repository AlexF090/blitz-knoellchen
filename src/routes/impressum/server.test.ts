import { describe, expect, it } from 'vitest';
import { GET } from './+server.ts';

describe('GET /impressum', () => {
	it('leitet dauerhaft auf das zentrale Impressum auf appool.de weiter', () => {
		expect.assertions(2);
		try {
			GET();
		} catch (thrown) {
			const redirectResult = thrown as { status: number; location: string };
			expect(redirectResult.status).toBe(301);
			expect(redirectResult.location).toBe('https://appool.de/impressum');
		}
	});
});
