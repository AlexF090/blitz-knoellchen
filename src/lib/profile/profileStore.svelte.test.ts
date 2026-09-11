import { describe, expect, it } from 'vitest';
import { createProfileStore } from './profileStore.svelte';

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
});
