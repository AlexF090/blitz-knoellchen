import { describe, expect, it } from 'vitest';
import { joinGermanList } from './joinGermanList';

describe('joinGermanList', () => {
	it.each([
		[[], ''],
		[['A'], 'A'],
		[['A', 'B'], 'A und B'],
		[['A', 'B', 'C'], 'A, B und C'],
		[['A', 'B', 'C', 'D'], 'A, B, C und D']
	])('%j -> %j', (items, expected) => {
		expect(joinGermanList(items)).toBe(expected);
	});
});
