import { describe, expect, it } from 'vitest';
import { createFixedWindowRateLimiter } from './fixedWindowRateLimiter';

describe('createFixedWindowRateLimiter', () => {
	it('lässt Anfragen bis zum Limit zu und blockiert danach', () => {
		const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });

		expect(limiter.tryConsume('1.2.3.4')).toBe(true);
		expect(limiter.tryConsume('1.2.3.4')).toBe(true);
		expect(limiter.tryConsume('1.2.3.4')).toBe(false);
	});

	it('zählt jeden Schlüssel getrennt', () => {
		const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });

		expect(limiter.tryConsume('1.2.3.4')).toBe(true);
		expect(limiter.tryConsume('5.6.7.8')).toBe(true);
		expect(limiter.tryConsume('1.2.3.4')).toBe(false);
	});

	it('gibt den Schlüssel nach Ablauf des Fensters wieder frei', () => {
		let currentTime = 0;
		const limiter = createFixedWindowRateLimiter({
			limit: 1,
			windowMs: 1000,
			now: () => currentTime
		});

		expect(limiter.tryConsume('1.2.3.4')).toBe(true);
		currentTime = 999;
		expect(limiter.tryConsume('1.2.3.4')).toBe(false);
		currentTime = 1000;
		expect(limiter.tryConsume('1.2.3.4')).toBe(true);
	});
});
