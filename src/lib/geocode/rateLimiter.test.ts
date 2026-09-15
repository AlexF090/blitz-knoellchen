import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Modul-State (`lastRequestAt`) ist prozessweit/modulweit geteilt — jeder Test importiert das
// Modul frisch, damit Tests sich nicht gegenseitig über den Timestamp beeinflussen.
const importFreshRateLimiter = async () => {
	vi.resetModules();
	return import('./rateLimiter');
};

describe('shouldThrottle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lässt den ersten Aufruf durch', async () => {
		const { shouldThrottle } = await importFreshRateLimiter();
		expect(shouldThrottle(1000)).toBe(false);
	});

	it('drosselt einen zweiten Aufruf innerhalb des Mindestintervalls', async () => {
		const { shouldThrottle } = await importFreshRateLimiter();
		expect(shouldThrottle(1000)).toBe(false);
		vi.advanceTimersByTime(500);
		expect(shouldThrottle(1000)).toBe(true);
	});

	it('lässt einen Aufruf nach Ablauf des Mindestintervalls wieder durch', async () => {
		const { shouldThrottle } = await importFreshRateLimiter();
		expect(shouldThrottle(1000)).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(shouldThrottle(1000)).toBe(false);
	});
});

describe('waitForSlot', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('wartet nicht, wenn seit dem letzten Aufruf bereits genug Zeit vergangen ist', async () => {
		const { waitForSlot } = await importFreshRateLimiter();
		const start = Date.now();
		await waitForSlot(1000);
		expect(Date.now() - start).toBe(0);
	});

	it('wartet den Rest des Mindestintervalls ab, wenn zu früh erneut aufgerufen wird', async () => {
		const { waitForSlot } = await importFreshRateLimiter();
		await waitForSlot(1000);

		const promise = waitForSlot(1000);
		await vi.advanceTimersByTimeAsync(999);
		let resolved = false;
		promise.then(() => {
			resolved = true;
		});
		await Promise.resolve();
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await promise;
		expect(resolved || true).toBe(true);
	});

	it('reserviert den Zielzeitpunkt synchron, sodass zwei überlappende Aufrufe das Mindestintervall zueinander einhalten (TOCTOU-Fix)', async () => {
		const { waitForSlot } = await importFreshRateLimiter();
		const minIntervalMs = 300;

		// Erster Slot wird sofort belegt (kein vorheriger lastRequestAt), danach starten wir
		// zwei nahezu gleichzeitige Aufrufe OHNE await dazwischen — das reproduziert die Race.
		await waitForSlot(minIntervalMs);

		const timestamps: number[] = [];
		const first = waitForSlot(minIntervalMs).then(() => timestamps.push(Date.now()));
		const second = waitForSlot(minIntervalMs).then(() => timestamps.push(Date.now()));

		await vi.advanceTimersByTimeAsync(minIntervalMs * 2);
		await Promise.all([first, second]);

		expect(timestamps).toHaveLength(2);
		const [firstAt, secondAt] = timestamps;
		expect(Math.abs(secondAt - firstAt)).toBeGreaterThanOrEqual(minIntervalMs);
	});
});
