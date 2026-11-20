import type { VehicleEntry } from '$lib/validation/formSchema';

const WORDING: Record<VehicleEntry['timeMode'], { verb: string; Vorgang: string }> = {
	halteverstoss: { verb: 'hielt', Vorgang: 'Halten' },
	parkverstoss: { verb: 'parkte', Vorgang: 'Parken' }
};

/** Ersetzt `{verb}` und `{Vorgang}` passend zum Halte- bzw. Parkverstoß. */
export const applyTimeModeWording = (text: string, timeMode: VehicleEntry['timeMode']): string =>
	text
		.replaceAll('{verb}', WORDING[timeMode].verb)
		.replaceAll('{Vorgang}', WORDING[timeMode].Vorgang);
