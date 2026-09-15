import { describe, expect, it } from 'vitest';
import {
	buttonDestructive,
	buttonDestructiveSecondary,
	buttonPrimary,
	buttonSecondary
} from './buttonStyles';

describe('buttonStyles', () => {
	it('buttonPrimary nutzt das primäre Button-Farbtoken', () => {
		expect(buttonPrimary).toContain('bg-primary-button');
	});

	it('buttonSecondary nutzt einen Outline-Stil', () => {
		expect(buttonSecondary).toContain('border-primary-500');
	});

	it('buttonDestructive nutzt das destruktive Button-Farbtoken', () => {
		expect(buttonDestructive).toContain('bg-destructive-button');
	});

	it('buttonDestructiveSecondary nutzt einen Outline-Stil ohne Füllfarbe', () => {
		expect(buttonDestructiveSecondary).toContain('border-error-fg');
		expect(buttonDestructiveSecondary).not.toContain('bg-');
	});
});
