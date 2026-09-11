import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Blitz-Knöllchen',
				short_name: 'Blitz-Knöllchen',
				description: 'Falschparker in unter 30 Sekunden an die Bußgeldstelle Köln melden.',
				lang: 'de',
				start_url: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icons/icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// Nur die App-Shell vorcachen, kein komplexes Runtime-Caching.
				globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
				// heic-to (nur für HEIC-Fotos per dynamic import geladen, mehrere MB durch die
				// gebündelte libheif-WASM) überschreitet Workbox' Standardlimit von 2 MiB, das
				// vor manifestTransforms greift und den Build sonst hart abbricht — daher hier
				// angehoben. Die Datei bleibt trotzdem außerhalb des Precache (s.u.).
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				// heic-to (wie zuvor heic2any) hat keinen stabilen Dateinamen (SvelteKit hasht
				// Chunk-Dateinamen ohne Namensanteil), daher per Größe statt per Glob-Pattern vom
				// Precache ausschließen — die App-Shell soll klein bleiben, die Datei wird bei
				// Bedarf ganz normal per Netzwerk nachgeladen.
				manifestTransforms: [
					(entries) => ({ manifest: entries.filter((entry) => (entry.size ?? 0) < 512 * 1024) })
				],
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						// /api/* darf nie gecacht werden — Geocoding/Send brauchen immer das Netz.
						urlPattern: /^\/api\//,
						handler: 'NetworkOnly'
					}
				]
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
