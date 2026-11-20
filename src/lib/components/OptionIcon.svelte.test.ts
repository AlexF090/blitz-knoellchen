import { Bike } from '@lucide/svelte';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OptionIcon from './OptionIcon.svelte';

describe('OptionIcon', () => {
	it('rendert ein Verkehrszeichen als dekoratives Bild', async () => {
		const { container } = await render(OptionIcon, {
			icon: { kind: 'sign', src: '/signs/zeichen-283-halteverbot.svg' }
		});

		const img = container.querySelector('img');
		expect(img?.getAttribute('src')).toBe('/signs/zeichen-283-halteverbot.svg');
		expect(img?.getAttribute('alt')).toBe('');
		expect(img?.closest('[aria-hidden="true"]')).not.toBeNull();
	});

	it('rendert ein einzelnes Emoji in normaler Größe, für Screenreader ausgeblendet', async () => {
		const { container } = await render(OptionIcon, {
			icon: { kind: 'emoji', character: '🚒' }
		});

		const wrapper = container.querySelector('[aria-hidden="true"]');
		expect(wrapper?.textContent?.trim()).toBe('🚒');
		expect(wrapper?.querySelector('.text-xl')).not.toBeNull();
	});

	it('verkleinert mehrere Emojis, damit sie in die Icon-Spalte passen', async () => {
		const { container } = await render(OptionIcon, {
			icon: { kind: 'emoji', character: '🚘🚘' }
		});

		const wrapper = container.querySelector('[aria-hidden="true"]');
		expect(wrapper?.textContent?.trim()).toBe('🚘🚘');
		expect(wrapper?.querySelector('.text-xs')).not.toBeNull();
	});

	it('rendert ein Lucide-Icon für Screenreader ausgeblendet', async () => {
		const { container } = await render(OptionIcon, {
			icon: { kind: 'symbol', component: Bike }
		});

		const svg = container.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg?.closest('[aria-hidden="true"]')).not.toBeNull();
		expect(container.querySelector('img')).toBeNull();
	});
});
