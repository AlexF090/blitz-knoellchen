import { describe, expect, it, vi } from 'vitest';
import {
	createBindingRateLimiter,
	createInMemoryRateLimiter,
	selectRateLimiter,
	type RateLimitBinding
} from './requestRateLimiter.ts';

const createBinding = (success: boolean): RateLimitBinding => ({
	limit: vi.fn(async () => ({ success }))
});

describe('createBindingRateLimiter', () => {
	it('fragt das Binding mit der IP als Schlüssel', async () => {
		const binding = createBinding(true);

		await expect(createBindingRateLimiter(binding).tryConsume('192.0.2.1')).resolves.toBe(true);
		expect(binding.limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
	});

	it('meldet false, wenn das Binding das Limit erreicht sieht', async () => {
		await expect(createBindingRateLimiter(createBinding(false)).tryConsume('a')).resolves.toBe(
			false
		);
	});
});

describe('createInMemoryRateLimiter', () => {
	it('blockiert nach dem Limit pro Schlüssel', async () => {
		const limiter = createInMemoryRateLimiter({ limit: 1 });

		await expect(limiter.tryConsume('a')).resolves.toBe(true);
		await expect(limiter.tryConsume('a')).resolves.toBe(false);
		await expect(limiter.tryConsume('b')).resolves.toBe(true);
	});
});

describe('selectRateLimiter', () => {
	it('nutzt das Binding, wenn kein Override gesetzt ist', async () => {
		const binding = createBinding(false);

		await expect(selectRateLimiter(binding, { limit: 5 }, undefined).tryConsume('a')).resolves.toBe(
			false
		);
		expect(binding.limit).toHaveBeenCalled();
	});

	it('nutzt mit Override den Speicher-Limiter statt des Bindings', async () => {
		const binding = createBinding(false);
		const limiter = selectRateLimiter(binding, { limit: 5 }, 2);

		await expect(limiter.tryConsume('a')).resolves.toBe(true);
		await expect(limiter.tryConsume('a')).resolves.toBe(true);
		await expect(limiter.tryConsume('a')).resolves.toBe(false);
		expect(binding.limit).not.toHaveBeenCalled();
	});

	it('fällt ohne Binding auf den Speicher-Limiter mit dem Standardlimit zurück', async () => {
		const limiter = selectRateLimiter(undefined, { limit: 1 }, undefined);

		await expect(limiter.tryConsume('a')).resolves.toBe(true);
		await expect(limiter.tryConsume('a')).resolves.toBe(false);
	});
});
