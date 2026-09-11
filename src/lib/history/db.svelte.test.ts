import { describe, expect, it } from 'vitest';
import {
	addEntry,
	getEntry,
	listEntries,
	getProfile,
	saveProfile,
	type HistoryEntry,
	type UserProfile
} from './db';

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => {
	return {
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		firstName: 'Max',
		lastName: 'Mustermann',
		locationAddress: 'Domkloster 4, 50667 Köln',
		incidentTypeLabels: ['Parken auf dem Gehweg'],
		thumbnails: [new Blob(['x'], { type: 'image/jpeg' })],
		...overrides
	};
};

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

describe('user profile', () => {
	it('speichert und liest ein Profil', async () => {
		const profile: UserProfile = {
			firstName: 'Max',
			lastName: 'Mustermann',
			addressStreet: 'Musterstraße',
			addressHouseNumber: '1',
			addressPostcode: '50667',
			addressCity: 'Köln',
			email: 'max@example.com'
		};
		await saveProfile(profile);
		expect(await getProfile()).toEqual(profile);
	});

	it('überschreibt ein bestehendes Profil beim erneuten Speichern', async () => {
		await saveProfile({
			firstName: 'Erika',
			lastName: 'Musterfrau',
			addressStreet: 'Musterweg',
			addressHouseNumber: '2',
			addressPostcode: '50668',
			addressCity: 'Köln',
			email: 'erika@example.com'
		});
		const loaded = await getProfile();
		expect(loaded?.firstName).toBe('Erika');
	});
});
