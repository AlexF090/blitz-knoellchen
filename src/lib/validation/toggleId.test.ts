import { describe, expect, it } from 'vitest';
import { toggleId } from './toggleId';

describe('toggleId', () => {
	it('hängt eine neue id hinten an', () => {
		expect(toggleId(['a'], 'b', true)).toEqual(['a', 'b']);
	});

	it('fügt eine bereits enthaltene id nicht doppelt ein', () => {
		expect(toggleId(['a', 'b'], 'a', true)).toEqual(['a', 'b']);
	});

	it('entfernt die id und behält die Reihenfolge der übrigen', () => {
		expect(toggleId(['a', 'b', 'c'], 'b', false)).toEqual(['a', 'c']);
	});

	it('lässt die Liste unverändert, wenn die zu entfernende id fehlt', () => {
		expect(toggleId(['a'], 'x', false)).toEqual(['a']);
	});

	it('verändert die übergebene Liste nicht', () => {
		const ids = ['a'];
		toggleId(ids, 'b', true);
		expect(ids).toEqual(['a']);
	});
});
