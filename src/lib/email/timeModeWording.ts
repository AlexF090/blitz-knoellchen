import type { VehicleEntry } from '$lib/validation/formSchema';

const WORDING: Record<VehicleEntry['timeMode'], { verb: string; noun: string }> = {
	halteverstoss: { verb: 'hielt', noun: 'Halten' },
	parkverstoss: { verb: 'parkte', noun: 'Parken' }
};

/** Ersetzt `{verb}` und `{noun}` passend zum Halte- bzw. Parkverstoß. */
export const applyTimeModeWording = (text: string, timeMode: VehicleEntry['timeMode']): string =>
	text.replaceAll('{verb}', WORDING[timeMode].verb).replaceAll('{noun}', WORDING[timeMode].noun);
