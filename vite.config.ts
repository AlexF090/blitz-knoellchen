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
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,svelte}'],
			exclude: [
				'src/**/*.{test,spec}.{ts,js}',
				'src/**/*.d.ts',
				'src/lib/index.ts',
				'src/lib/geocode/geocodeAddress.ts',
				'src/lib/report/sendResults.ts',
				'src/routes/**/$types.d.ts'
			],
			// Ziel ist 100% — praktisch jede Datei erreicht das auch. Für den Rest gibt es zwei
			// begründete, einzeln recherchierte Ausnahme-Kategorien (kein pauschaler Freifahrtschein):
			// (a) Svelte-Compiler/v8-Instrumentierungsartefakt: `bind:value`, Template-Interpolationen
			//     (z.B. `{buttonPrimary}`) und `$props()`-Default-Destrukturierung erzeugen kompilierten
			//     Code, den v8 als zusätzliche Branch/Function zählt, obwohl es keine echte Verzweigung
			//     im Quellcode gibt — verifiziert an mehreren bereits vollständig getesteten Stellen
			//     (z.B. beide Zweige von Props mit Default explizit getestet, trotzdem 0% Branch).
			// (b) Echter, aber über die öffentliche Komponenten-/Modul-API nie erreichbarer Defensiv-Code
			//     (z.B. `if (!container) return;` bei einem `bind:this`, das nie vor dem ersten Event
			//     ungebunden ist; ein `if (oldVersion < 3)`-Zweig, den `idb` laut eigener Semantik nie
			//     falsch aufruft; ein SSR-Guard, der im Browser-Testprojekt strukturell immer true ist).
			//
			// WICHTIG: vitest wendet die globalen Thresholds unten IMMER auf die Gesamtsumme aller
			// Dateien an, auch wenn einzelne Dateien per Glob unten eigene (niedrigere) Werte haben —
			// die globalen Werte sind daher bewusst knapp unter dem aktuell tatsächlich erreichten
			// Gesamtwert gesetzt, nicht 100. Die Glob-Einträge sind zusätzliche, engere Regressions-Floors
			// für genau die betroffenen Dateien; jede Datei, die hier nicht explizit gelistet ist, bleibt
			// implizit bei 100% gefordert (jede Regression drückt sofort den Gesamtwert unter den Floor).
			thresholds: {
				lines: 99.5,
				branches: 88,
				functions: 99.5,
				statements: 98.5,
				'src/lib/components/Footer.svelte': { branches: 70 }, // (a) __APP_VERSION__ Vite-Define
				'src/lib/components/InstallBanner.svelte': { branches: 85 }, // (a)
				'src/lib/components/PhotoLightbox.svelte': {
					statements: 95,
					branches: 80,
					lines: 95
				}, // (b) bind:this-Guards für container/dialog
				'src/lib/components/PhotoPool.svelte': { branches: 80 }, // (a)
				'src/lib/components/PullToRefresh.svelte': { statements: 95, branches: 90 }, // (a)+(b)
				'src/lib/components/ReportForm.svelte': { statements: 95, branches: 75 }, // (b) vier Defensiv-Guards, s. PR-Beschreibung
				'src/lib/components/VehicleBlock.svelte': {
					statements: 95,
					branches: 70,
					functions: 95,
					lines: 95
				}, // (a)+(b)
				'src/lib/components/icons/*.svelte': { branches: 0 }, // (a) $props()-Default
				'src/lib/history/db.ts': { branches: 90 }, // (b) idb ruft upgrade() nie mit oldVersion>=targetVersion auf
				'src/lib/pwa/installPrompt.svelte.ts': { branches: 80 }, // (b) `if (browser)`-SSR-Guard
				'src/routes/+layout.svelte': { branches: 45 }, // (a) `dev`-Build-Time-Konstante
				'src/routes/+page.svelte': { statements: 80, branches: 45, lines: 75 }, // (a) Prop-Weitergabe an ReportForm
				'src/routes/historie/+page.svelte': { statements: 95, branches: 60 } // (b) zwei Defensiv-Guards (gelöschtes Lightbox-Target)
			}
		},
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
