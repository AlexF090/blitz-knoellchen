import { describe, expect, it, vi } from 'vitest';
import { onEnterKey } from './onEnterKey';

describe('onEnterKey', () => {
	it('ruft die Aktion auf und verhindert das Standardverhalten bei Enter', () => {
		const action = vi.fn();
		const preventDefault = vi.fn();
		const handler = onEnterKey(action);

		handler({ key: 'Enter', preventDefault } as unknown as KeyboardEvent);

		expect(preventDefault).toHaveBeenCalledOnce();
		expect(action).toHaveBeenCalledOnce();
	});

	it('ignoriert andere Tasten', () => {
		const action = vi.fn();
		const preventDefault = vi.fn();
		const handler = onEnterKey(action);

		handler({ key: 'Tab', preventDefault } as unknown as KeyboardEvent);

		expect(preventDefault).not.toHaveBeenCalled();
		expect(action).not.toHaveBeenCalled();
	});
});
