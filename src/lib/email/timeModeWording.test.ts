import { describe, expect, it } from 'vitest';
import { applyTimeModeWording } from './timeModeWording';

describe('applyTimeModeWording', () => {
	it('setzt Halteverstoß-Wortlaut ein', () => {
		expect(applyTimeModeWording('Das Fahrzeug {verb}. {noun} verboten.', 'halteverstoss')).toBe(
			'Das Fahrzeug hielt. Halten verboten.'
		);
	});

	it('setzt Parkverstoß-Wortlaut ein', () => {
		expect(applyTimeModeWording('Das Fahrzeug {verb}. {noun} verboten.', 'parkverstoss')).toBe(
			'Das Fahrzeug parkte. Parken verboten.'
		);
	});

	it('ersetzt jedes Vorkommen und lässt Text ohne Platzhalter unverändert', () => {
		expect(applyTimeModeWording('{verb} und {verb}', 'parkverstoss')).toBe('parkte und parkte');
		expect(applyTimeModeWording('Nichts', 'parkverstoss')).toBe('Nichts');
	});
});
