import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateLimitBinding } from './requestRateLimiter.ts';

const workerEnvironment: {
	SEND_RATE_LIMITER?: RateLimitBinding;
	GEOCODE_RATE_LIMITER?: RateLimitBinding;
} = {};
vi.mock('./workerBindings.ts', () => ({ getWorkerBindings: () => workerEnvironment }));

const privateEnvironment: { SEND_LIMIT_PER_MINUTE: number | undefined } = {
	SEND_LIMIT_PER_MINUTE: undefined
};
vi.mock('$app/env/private', () => privateEnvironment);

const loadModule = async () => {
	vi.resetModules();
	return import('./rateLimiters.ts');
};

describe('rateLimiters', () => {
	beforeEach(() => {
		delete workerEnvironment.SEND_RATE_LIMITER;
		delete workerEnvironment.GEOCODE_RATE_LIMITER;
		privateEnvironment.SEND_LIMIT_PER_MINUTE = undefined;
	});

	it('nutzt die Bindings aus wrangler.jsonc', async () => {
		const send: RateLimitBinding = { limit: vi.fn(async () => ({ success: false })) };
		const geocode: RateLimitBinding = { limit: vi.fn(async () => ({ success: true })) };
		workerEnvironment.SEND_RATE_LIMITER = send;
		workerEnvironment.GEOCODE_RATE_LIMITER = geocode;
		const { getSendRateLimiter, getGeocodeRateLimiter } = await loadModule();

		await expect(getSendRateLimiter().tryConsume('192.0.2.1')).resolves.toBe(false);
		await expect(getGeocodeRateLimiter().tryConsume('192.0.2.1')).resolves.toBe(true);
		expect(send.limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
		expect(geocode.limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
	});

	it('zählt ohne Binding im Speicher weiter, über mehrere Aufrufe hinweg', async () => {
		privateEnvironment.SEND_LIMIT_PER_MINUTE = 1;
		const { getSendRateLimiter } = await loadModule();

		await expect(getSendRateLimiter().tryConsume('192.0.2.1')).resolves.toBe(true);
		await expect(getSendRateLimiter().tryConsume('192.0.2.1')).resolves.toBe(false);
	});

	it('greift ohne Binding und ohne Override auf die Standardlimits zurück', async () => {
		const { getSendRateLimiter, getGeocodeRateLimiter } = await loadModule();
		const sendResults = await Promise.all(
			Array.from({ length: 11 }, () => getSendRateLimiter().tryConsume('192.0.2.1'))
		);
		const geocodeResults = await Promise.all(
			Array.from({ length: 31 }, () => getGeocodeRateLimiter().tryConsume('192.0.2.1'))
		);

		expect(sendResults.filter(Boolean)).toHaveLength(10);
		expect(geocodeResults.filter(Boolean)).toHaveLength(30);
	});
});
