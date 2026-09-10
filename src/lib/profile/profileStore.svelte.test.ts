import { describe, expect, it, beforeEach } from 'vitest';
import { createProfileStore } from './profileStore.svelte';

describe('profileStore', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('startet mit leerem Profil ohne gespeicherte Daten', () => {
		const store = createProfileStore();
		expect(store.value).toEqual({ firstName: '', lastName: '', address: '', email: '' });
	});

	it('persistiert das Profil in localStorage', () => {
		const store = createProfileStore();
		store.save({
			firstName: 'Max',
			lastName: 'Mustermann',
			address: 'Musterstraße 1, 50667 Köln',
			email: 'max@example.com'
		});
		expect(store.value.firstName).toBe('Max');

		const reloaded = createProfileStore();
		expect(reloaded.value.firstName).toBe('Max');
		expect(reloaded.value.email).toBe('max@example.com');
	});
});
