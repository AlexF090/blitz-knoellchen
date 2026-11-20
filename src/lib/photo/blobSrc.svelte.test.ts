import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BlobSrcFixture from './BlobSrcFixture.svelte';

describe('blobSrc', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('setzt die Object-URL als src', async () => {
		const blob = new Blob(['x'], { type: 'image/png' });
		const { container } = await render(BlobSrcFixture, { blob });
		expect(container.querySelector('img')?.src).toMatch(/^blob:/);
	});

	it('gibt die Object-URL beim Entfernen des Elements frei', async () => {
		const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
		const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		const blob = new Blob(['x'], { type: 'image/png' });
		const { container, unmount } = await render(BlobSrcFixture, { blob });

		expect(createSpy).toHaveBeenCalledWith(blob);
		expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:test-url');
		expect(revokeSpy).not.toHaveBeenCalled();

		await unmount();
		expect(revokeSpy).toHaveBeenCalledWith('blob:test-url');
	});

	it('erzeugt bei neuem Blob eine neue URL und gibt die alte frei', async () => {
		const createSpy = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValueOnce('blob:first')
			.mockReturnValueOnce('blob:second');
		const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		const { rerender } = await render(BlobSrcFixture, { blob: new Blob(['a']) });

		await rerender({ blob: new Blob(['b']) });

		expect(createSpy).toHaveBeenCalledTimes(2);
		expect(revokeSpy).toHaveBeenCalledWith('blob:first');
	});
});
