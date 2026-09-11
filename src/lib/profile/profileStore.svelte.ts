import { browser } from '$app/environment';

export interface UserProfile {
	firstName: string;
	lastName: string;
	address: string;
	email: string;
}

const STORAGE_KEY = 'knoellchen-blitz:profile';

const EMPTY_PROFILE: UserProfile = { firstName: '', lastName: '', address: '', email: '' };

const loadProfile = (): UserProfile => {
	if (!browser) return { ...EMPTY_PROFILE };
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return { ...EMPTY_PROFILE };
	try {
		return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
	} catch {
		return { ...EMPTY_PROFILE };
	}
};

export const createProfileStore = () => {
	let profile = $state(loadProfile());

	return {
		get value() {
			return profile;
		},
		save(next: UserProfile) {
			profile = next;
			if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		}
	};
};
