import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendVehicleReport } from './sendClient';

describe('sendVehicleReport', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns true when the response is ok', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		expect(await sendVehicleReport(new FormData())).toBe(true);
	});

	it('returns false when the response is not ok', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
		expect(await sendVehicleReport(new FormData())).toBe(false);
	});

	it('returns false instead of throwing on a network error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		expect(await sendVehicleReport(new FormData())).toBe(false);
	});
});
