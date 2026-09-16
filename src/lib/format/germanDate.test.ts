import { describe, expect, it } from 'vitest';
import { formatIsoDateDMY, formatTimeRange } from './germanDate';

describe('formatIsoDateDMY', () => {
	it('formatiert ein reines ISO-Datum als TT.MM.JJJJ', () => {
		expect(formatIsoDateDMY('2024-01-05')).toBe('05.01.2024');
	});

	it('extrahiert den Datumsteil aus einem vollen ISO-Timestamp mit Zeitanteil', () => {
		expect(formatIsoDateDMY('2024-01-05T10:00:00')).toBe('05.01.2024');
	});

	it('fällt bei unvollständigem Datum auf die Rohangabe zurück', () => {
		expect(formatIsoDateDMY('2024-01')).toBe('2024-01');
	});

	it('fällt bei leerem String auf die Rohangabe zurück', () => {
		expect(formatIsoDateDMY('')).toBe('');
	});
});

describe('formatTimeRange', () => {
	it('gibt nur die Startzeit zurück, wenn keine Endzeit gesetzt ist', () => {
		expect(formatTimeRange({ time: '14:30' })).toBe('14:30');
	});

	it('gibt einen Zeitraum mit En-Dash zurück, wenn eine Endzeit gesetzt ist', () => {
		expect(formatTimeRange({ time: '14:30', endTime: '14:45' })).toBe('14:30–14:45');
	});
});
