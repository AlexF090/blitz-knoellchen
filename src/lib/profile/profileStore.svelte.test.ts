import { describe, expect, it, vi } from 'vitest';
import { getProfile } from '$lib/history/db';
import { createProfileStore } from './profileStore.svelte';
import type { UserProfile } from '$lib/history/db';

// Eigene In-Memory-Fake statt Durchreichen an die echte IndexedDB (via importOriginal):
// db.svelte.test.ts testet $lib/history/db bereits gegen die echte IndexedDB mit demselben
// festen Profil-Schlüssel — liefen beide Testdateien parallel, überschrieben sie sich
// gegenseitig und machten db.ts' Branch-Coverage je nach Ausführungsreihenfolge flaky.
vi.mock('$lib/history/db', () => {
	let stored: UserProfile | undefined;
	return {
		getProfile: vi.fn(async () => stored),
		saveProfile: vi.fn(async (profile: UserProfile) => {
			stored = profile;
		})
	};
});

describe('profileStore', () => {
	it('startet mit leerem Profil', () => {
		const store = createProfileStore();
		expect(store.value).toEqual({
			firstName: '',
			lastName: '',
			addressStreet: '',
			addressPostcode: '',
			addressCity: '',
			email: '',
			phone: ''
		});
	});

	it('persistiert das Profil in der IndexedDB und lädt es in einem neuen Store wieder', async () => {
		const store = createProfileStore();
		await store.save({
			firstName: 'Max',
			lastName: 'Mustermann',
			addressStreet: 'Musterstraße 1',
			addressPostcode: '50667',
			addressCity: 'Köln',
			email: 'max@example.com'
		});
		expect(store.value.firstName).toBe('Max');

		const reloaded = createProfileStore();
		await reloaded.load();
		expect(reloaded.value.firstName).toBe('Max');
		expect(reloaded.value.email).toBe('max@example.com');
	});

	it('lässt das Profil unverändert, wenn beim Laden noch keines gespeichert ist', async () => {
		const store = createProfileStore();
		vi.mocked(getProfile).mockResolvedValueOnce(undefined);

		await store.load();

		expect(store.value).toEqual({
			firstName: '',
			lastName: '',
			addressStreet: '',
			addressPostcode: '',
			addressCity: '',
			email: '',
			phone: ''
		});
	});
});
