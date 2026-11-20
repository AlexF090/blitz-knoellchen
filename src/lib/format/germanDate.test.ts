import { describe, expect, it } from 'vitest';
import { formatIsoDateDMY, formatTimeRange, formatTimestampDE } from './germanDate';

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

describe('formatTimestampDE', () => {
	it('formatiert einen Zeitstempel als "TT.MM.JJJJ, HH:MM" in Berliner Zeit (Winterzeit)', () => {
		expect(formatTimestampDE(Date.UTC(2026, 10, 19, 13, 32))).toBe('19.11.2026, 14:32');
	});

	it('berücksichtigt die Sommerzeit', () => {
		expect(formatTimestampDE(Date.UTC(2026, 6, 1, 12, 5))).toBe('01.07.2026, 14:05');
	});

	it('wechselt um Mitternacht Berliner Zeit auf den nächsten Tag', () => {
		expect(formatTimestampDE(Date.UTC(2026, 10, 19, 23, 30))).toBe('20.11.2026, 00:30');
	});
});
