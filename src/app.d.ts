/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/pwa-assets" />
declare global {
	namespace App {}

	// Per Vite `define` aus package.json injiziert, siehe vite.config.ts.
	const __APP_VERSION__: string;
}

export {};
