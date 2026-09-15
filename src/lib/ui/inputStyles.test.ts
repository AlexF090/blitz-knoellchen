import { describe, expect, it } from 'vitest';
import { fieldErrorBase, inputBase, labelBase, requiredMark } from './inputStyles';

describe('inputStyles', () => {
	it('labelBase enthält die Basis-Label-Textfarbe', () => {
		expect(labelBase).toContain('text-ink');
	});

	it('requiredMark nutzt die Fehlerfarbe', () => {
		expect(requiredMark).toBe('text-error-fg');
	});

	it('inputBase definiert Rahmen und volle Breite', () => {
		expect(inputBase).toContain('border-border');
		expect(inputBase).toContain('w-full');
	});

	it('fieldErrorBase nutzt die Fehlerfarbe', () => {
		expect(fieldErrorBase).toContain('text-error-fg');
	});
});
