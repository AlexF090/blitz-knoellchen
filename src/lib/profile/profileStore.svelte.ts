import { getProfile, saveProfile, type UserProfile } from '$lib/history/db';

export type { UserProfile };

const EMPTY_PROFILE: UserProfile = {
	firstName: '',
	lastName: '',
	addressStreet: '',
	addressPostcode: '',
	addressCity: '',
	email: '',
	phone: ''
};

/** Reaktiver Store für das Melderprofil, gespiegelt in die IndexedDB. */
export const createProfileStore = () => {
	let profile = $state<UserProfile>({ ...EMPTY_PROFILE });

	return {
		get value() {
			return profile;
		},
		async load() {
			const stored = await getProfile();
			if (stored) profile = stored;
		},
		async save(next: UserProfile) {
			profile = next;
			await saveProfile(next);
		}
	};
};
