import { describe, expect, it } from 'vitest';
import { pruneWarnings } from './photoWarnings';

describe('pruneWarnings', () => {
	it('keeps warnings for vehicles that still exist', () => {
		const result = pruneWarnings({ a: 'warn-a', b: 'warn-b' }, [{ id: 'a' }, { id: 'b' }]);
		expect(result).toEqual({ a: 'warn-a', b: 'warn-b' });
	});

	it('drops warnings for vehicles that no longer exist (removeVehicle leak)', () => {
		const result = pruneWarnings({ a: 'warn-a', b: 'warn-b' }, [{ id: 'a' }]);
		expect(result).toEqual({ a: 'warn-a' });
	});

	it('drops the old id after resetVehicle assigns a fresh uuid', () => {
		const result = pruneWarnings({ 'old-id': 'warn' }, [{ id: 'new-id' }]);
		expect(result).toEqual({});
	});

	it('returns an empty object when no vehicles remain', () => {
		expect(pruneWarnings({ a: 'warn-a' }, [])).toEqual({});
	});
});
