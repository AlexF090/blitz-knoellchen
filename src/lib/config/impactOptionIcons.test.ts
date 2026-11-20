import { describe, expect, it } from 'vitest';
import { ENDANGERED_PERSON_ICONS, IMPAIRMENT_ICONS } from './impactOptionIcons';
import { ENDANGERED_PERSON_OPTIONS, IMPAIRMENT_OPTIONS } from './impactOptions';

describe.each([
	{ name: 'IMPAIRMENT_ICONS', icons: IMPAIRMENT_ICONS, options: IMPAIRMENT_OPTIONS },
	{
		name: 'ENDANGERED_PERSON_ICONS',
		icons: ENDANGERED_PERSON_ICONS,
		options: ENDANGERED_PERSON_OPTIONS
	}
])('$name', ({ icons, options }) => {
	it('hat für jede Option ein Icon', () => {
		for (const option of options) {
			expect(icons[option.id], option.id).toBeDefined();
		}
	});

	it('enthält keine Icons für unbekannte Optionen', () => {
		const knownIds = new Set(options.map((option) => option.id));
		for (const id of Object.keys(icons)) {
			expect(knownIds.has(id), id).toBe(true);
		}
	});
});
