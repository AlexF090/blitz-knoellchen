import { getProfile, saveProfile, type UserProfile } from '$lib/history/db';

export type { UserProfile };

const EMPTY_PROFILE: UserProfile = {
	firstName: '',
	lastName: '',
	addressStreet: '',
	addressHouseNumber: '',
	addressPostcode: '',
	addressCity: '',
	email: ''
};

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
