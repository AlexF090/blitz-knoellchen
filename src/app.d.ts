/// <reference types="@unplugin-pwa/core/svelte" />
/// <reference types="@unplugin-pwa/core/info" />
/// <reference types="@unplugin-pwa/core/pwa-assets" />
declare global {
	namespace App {}

	// Per Vite `define` aus package.json injiziert, siehe vite.config.ts.
	const __APP_VERSION__: string;
}

export {};
