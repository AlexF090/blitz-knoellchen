import type { OptionIconMap } from './optionIcon';

/** Icon je Option aus `IMPAIRMENT_OPTIONS`. */
export const IMPAIRMENT_ICONS: OptionIconMap = {
	'gehweg-blockiert': { kind: 'emoji', character: '🚷' },
	'gehweg-eingeengt': { kind: 'emoji', character: '🚶' },
	'ausweichen-fahrbahn': { kind: 'emoji', character: '🛣️' },
	'radverkehr-ausweichen': { kind: 'emoji', character: '🚲' },
	'fahrbahn-blockiert': { kind: 'emoji', character: '🚧' },
	'sicht-verdeckt': { kind: 'emoji', character: '👁️' },
	'rettungsweg-blockiert': { kind: 'emoji', character: '🚑' },
	'oepnv-behindert': { kind: 'emoji', character: '🚌' }
};

/** Icon je Option aus `ENDANGERED_PERSON_OPTIONS`. */
export const ENDANGERED_PERSON_ICONS: OptionIconMap = {
	'kinder-schulweg': { kind: 'emoji', character: '🎒' },
	fussgaenger: { kind: 'emoji', character: '🚶' },
	'rollstuhl-rollator': { kind: 'emoji', character: '🧑‍🦽' },
	kinderwagen: { kind: 'emoji', character: '👶' },
	radfahrende: { kind: 'emoji', character: '🚴' },
	sehbehindert: { kind: 'emoji', character: '🧑‍🦯' }
};
