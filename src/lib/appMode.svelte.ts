export type AppMode = 'demo' | 'live';

let mode = $state<AppMode | null>(null);

export const appMode = {
	get current() {
		return mode;
	},
	set(value: AppMode) {
		mode = value;
	}
};
