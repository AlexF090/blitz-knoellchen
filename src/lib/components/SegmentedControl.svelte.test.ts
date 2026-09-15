import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SegmentedControl from './SegmentedControl.svelte';

describe('SegmentedControl', () => {
	it('markiert die Option als checked, deren Value dem aktuellen Value entspricht', async () => {
		render(SegmentedControl, {
			name: 'mode',
			value: 'b',
			options: [
				{ value: 'a', label: 'A', ariaLabel: 'Option A' },
				{ value: 'b', label: 'B', ariaLabel: 'Option B' }
			],
			onChange: vi.fn()
		});

		await expect.element(page.getByRole('radio', { name: 'Option A' })).not.toBeChecked();
		await expect.element(page.getByRole('radio', { name: 'Option B' })).toBeChecked();
	});

	it('ruft onChange mit dem korrekten Value beim Klick auf eine Option auf', async () => {
		const onChange = vi.fn();
		render(SegmentedControl, {
			name: 'mode',
			value: 'a',
			options: [
				{ value: 'a', label: 'A', ariaLabel: 'Option A' },
				{ value: 'b', label: 'B', ariaLabel: 'Option B' }
			],
			onChange
		});

		await userEvent.click(page.getByRole('radio', { name: 'Option B' }));

		expect(onChange).toHaveBeenCalledWith('b');
	});

	it('nutzt den Leerstring-Fallback für das Label bei fehlendem option.label', async () => {
		// label ist laut Typ ein Pflichtfeld; Svelte kompiliert den Text-Node dennoch mit einem
		// `?? ''`-Fallback. Nur ein zur Laufzeit fehlendes label (hier bewusst per null erzwungen)
		// deckt diesen Fallback-Zweig ab.
		const { container } = render(SegmentedControl, {
			name: 'mode',
			value: 'a',
			options: [{ value: 'a', label: null as unknown as string, ariaLabel: 'Option A' }],
			onChange: vi.fn()
		});

		const label = container.querySelector('label');
		expect(label?.textContent?.trim()).toBe('');
	});
});
