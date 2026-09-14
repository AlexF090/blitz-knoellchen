import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import pkg from './package.json' with { type: 'json' };

const appVersion = pkg.version;

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(appVersion)
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fest @sveltejs/adapter-vercel statt adapter-auto (einziges Deployment-Ziel). runtime
			// explizit gesetzt, sonst rät adapter-vercel anhand der lokalen (z.B. per nvm neueren,
			// von Vercel noch nicht unterstützten) Node-Version und bricht den Build sonst ab.
			adapter: adapter({ runtime: 'nodejs22.x' })
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
				background_color: 'oklch(100% 0 0)',
				theme_color: 'oklch(100% 0 0)'
				// icons: von @vite-pwa/assets-generator generiert, s. pwaAssets unten
				// (overrideManifestIcons).
			},
			pwaAssets: {
				// Muss direkt in `static/` liegen (SvelteKits Pendant zu Vites `publicDir`) — die
				// generierten Dateinamen werden root-relativ ins Manifest geschrieben.
				image: 'static/app-icon.svg',
				// theme-color wird bereits hell/dunkel-abhängig in +layout.svelte gesetzt.
				injectThemeColor: false,
				overrideManifestIcons: true,
				// Eigenes Preset statt 'minimal-2023': Icon ist bereits randlos/quadratisch mit
				// eigenem Innenabstand, Standard-Padding würde es zusätzlich verkleinern.
				preset: {
					transparent: {
						sizes: [64, 192, 512],
						favicons: [[48, 'favicon.ico']],
						padding: 0,
						resizeOptions: { background: 'transparent' }
					},
					maskable: {
						sizes: [512],
						padding: 0,
						resizeOptions: { background: '#255a54' }
					},
					apple: {
						sizes: [180],
						padding: 0,
						resizeOptions: { background: '#255a54' }
					}
				}
			},
			workbox: {
				// Nur die App-Shell vorcachen, kein komplexes Runtime-Caching.
				globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
				// heic-to (dynamic import, mehrere MB durch die gebündelte libheif-WASM)
				// überschreitet Workbox' Standardlimit von 2 MiB, das vor manifestTransforms
				// greift und den Build sonst abbricht — daher angehoben, bleibt aber trotzdem
				// außerhalb des Precache (s.u., kein stabiler Chunk-Dateiname für ein Glob).
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
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
