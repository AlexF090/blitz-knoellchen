import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BrandIcon from './BrandIcon.svelte';

describe('BrandIcon', () => {
	it('erzeugt bei mehreren Instanzen unterschiedliche clipPath-IDs (keine Kollision)', async () => {
		await render(BrandIcon);
		await render(BrandIcon);

		const clipPaths = document.querySelectorAll('clipPath');
		expect(clipPaths).toHaveLength(2);

		const ids = Array.from(clipPaths).map((element) => element.id);
		expect(ids[0]).toBeTruthy();
		expect(ids[1]).toBeTruthy();
		expect(ids[0]).not.toBe(ids[1]);
	});
});
