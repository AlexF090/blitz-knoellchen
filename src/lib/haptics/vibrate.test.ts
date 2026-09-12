import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerHaptic } from './vibrate';

const originalVibrate = Object.getOwnPropertyDescriptor(navigator, 'vibrate');

afterEach(() => {
	if (originalVibrate) {
		Object.defineProperty(navigator, 'vibrate', originalVibrate);
	} else {
		Reflect.deleteProperty(navigator, 'vibrate');
	}
});

describe('triggerHaptic', () => {
	it('ruft navigator.vibrate mit dem passenden Muster auf, wenn unterstützt', () => {
		const vibrate = vi.fn();
		Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });

		triggerHaptic('success');

		expect(vibrate).toHaveBeenCalledWith(15);
	});

	it('nutzt für "warning" ein Muster aus mehreren Werten', () => {
		const vibrate = vi.fn();
		Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });

		triggerHaptic('warning');

		expect(vibrate).toHaveBeenCalledWith([20, 40, 20]);
	});

	it('bleibt folgenlos, wenn der Browser (z.B. iOS Safari) kein vibrate unterstützt', () => {
		Reflect.deleteProperty(navigator, 'vibrate');

		expect(() => triggerHaptic('selection')).not.toThrow();
	});
});
