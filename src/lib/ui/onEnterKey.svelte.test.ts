import { describe, expect, it, vi } from 'vitest';
import { onEnterKey } from './onEnterKey';

const pressKey = (target: HTMLElement, key: string, handler: (event: KeyboardEvent) => void) => {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	target.addEventListener('keydown', handler, { once: true });
	target.dispatchEvent(event);
	return event;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	attributes: Record<string, string> = {}
) => {
	const element = document.createElement(tagName);
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
	document.body.append(element);
	return element;
};

describe('onEnterKey', () => {
	it('ruft bei Enter in einem Textfeld die Aktion auf und verhindert das Absenden', () => {
		const action = vi.fn();

		const event = pressKey(createElement('input', { type: 'text' }), 'Enter', onEnterKey(action));

		expect(event.defaultPrevented).toBe(true);
		expect(action).toHaveBeenCalledOnce();
	});

	it('ignoriert andere Tasten', () => {
		const action = vi.fn();

		const event = pressKey(createElement('input'), 'Tab', onEnterKey(action));

		expect(event.defaultPrevented).toBe(false);
		expect(action).not.toHaveBeenCalled();
	});

	it('lässt Enter in einer Textarea als Zeilenumbruch durch', () => {
		const action = vi.fn();

		const event = pressKey(createElement('textarea'), 'Enter', onEnterKey(action));

		expect(event.defaultPrevented).toBe(false);
		expect(action).not.toHaveBeenCalled();
	});

	it('ignoriert Checkboxen und Radio-Buttons', () => {
		const action = vi.fn();

		pressKey(createElement('input', { type: 'checkbox' }), 'Enter', onEnterKey(action));
		pressKey(createElement('input', { type: 'radio' }), 'Enter', onEnterKey(action));

		expect(action).not.toHaveBeenCalled();
	});

	it('ignoriert Enter, das ein inneres Element schon behandelt hat', () => {
		const action = vi.fn();
		const input = createElement('input');
		input.addEventListener('keydown', (event) => event.preventDefault(), { once: true });

		pressKey(input, 'Enter', onEnterKey(action));

		expect(action).not.toHaveBeenCalled();
	});
});
