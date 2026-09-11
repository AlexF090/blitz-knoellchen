import { describe, expect, it } from 'vitest';
import { addEntry, getEntry, listEntries, type HistoryEntry } from './db';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
	return {
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		firstName: 'Max',
		lastName: 'Mustermann',
		locationAddress: 'Domkloster 4, 50667 Köln',
		incidentTypeLabels: ['Parken auf dem Gehweg'],
		thumbnail: new Blob(['x'], { type: 'image/jpeg' }),
		...overrides
	};
}

describe('history db', () => {
	it('speichert und liest einen Eintrag', async () => {
		const entry = makeEntry();
		await addEntry(entry);
		const loaded = await getEntry(entry.id);
		expect(loaded?.id).toBe(entry.id);
		expect(loaded?.locationAddress).toBe(entry.locationAddress);
	});

	it('listet Einträge absteigend nach Zeitstempel', async () => {
		const older = makeEntry({ timestamp: 1000 });
		const newer = makeEntry({ timestamp: 2000 });
		await addEntry(older);
		await addEntry(newer);

		const entries = await listEntries();
		const olderIndex = entries.findIndex((e) => e.id === older.id);
		const newerIndex = entries.findIndex((e) => e.id === newer.id);
		expect(newerIndex).toBeLessThan(olderIndex);
	});
});
