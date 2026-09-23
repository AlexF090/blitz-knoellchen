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
			adapter: adapter({ runtime: 'nodejs22.x' }),

			// CSP über SvelteKits eingebaute Unterstützung statt manuell in hooks.server.ts, damit
			// SvelteKit das von ihm selbst injizierte Bootstrap-<script> automatisch per Nonce/Hash
			// freischaltet (mode: 'auto' → Nonce bei dynamischem Rendering, Hash bei Prerendering).
			// Direktiven basieren auf einer vollständigen Durchsicht aller externen Aufrufe:
			// LocationIQ (api/geocode) und Brevo (api/send) laufen ausschließlich serverseitig, der
			// Browser ruft nur eigene /api/*-Endpunkte auf. style-src braucht 'unsafe-inline':
			// dynamische style="..."-Attribute in PullToRefresh.svelte, PhotoLightbox.svelte
			// (Per-Frame-Transform, nicht hashbar), Wordmark.svelte und app.html. Gilt nur für
			// HTML-Seiten (SvelteKits Render-Pfad) — X-Frame-Options/COOP für alle Responses
			// inkl. /api/* liegen in hooks.server.ts.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'manifest-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
					// KEIN `require-trusted-types-for: ['script']`: live gegen den Production-Build
					// getestet (Chromium/Playwright) — SvelteKits eigener Chunk-Loader weist
					// dynamisch `script.src` zu (Lazy-Loading der Route-Module), was der Browser
					// dann mit "This document requires 'TrustedScriptURL' assignment" blockt und die
					// komplette Client-Hydration verhindert. Eine eigene Trusted-Types-Policy dafür
					// wäre ein separates, nicht triviales Vorhaben (Policy für den Vite/SvelteKit-
					// Modul-Loader schreiben) — daher hier bewusst nicht aktiviert. Der Lighthouse-
					// Befund `trusted-types-xss` bleibt dadurch offen.
				}
			}
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
			//     Sonderfall davon: `bind:value={obj.feld}` auf einem `$bindable()`-Objekt-Prop
			//     kompiliert zu einem `get value()`/`set value()`-Paar; v8 meldet davon pro Binding
			//     genau eine Funktion als nie aufgerufen, obwohl Tests sowohl das Rendern des Werts
			//     als auch das Zurückschreiben bei Eingabe nachweisen. Betrifft nur Bindings an
			//     Kind-Komponenten — `bind:value` auf einem echten DOM-Element (z.B. das <select>
			//     in VehicleDetailsFieldset) wird korrekt als abgedeckt gezählt.
			//     Gegenprobe, falls die Zahlen später erneut hinterfragt werden: In
			//     IncidentLocationFieldset.svelte meldet v8 genau 7 unabgedeckte Funktionen, eine pro
			//     `bind:value` — obwohl der Test "übernimmt Datum, Uhrzeit und Adressfelder in das
			//     Fahrzeug" nachweislich in jedes einzelne dieser 7 Felder schreibt und das Ergebnis
			//     am Fahrzeug-Objekt assertiert. Insgesamt gehen 17 solcher Phantom-Funktionen auf
			//     dieses Muster zurück; sie sind der einzige Grund, warum `functions` unten bei 97
			//     statt bei 99.5 steht. Wer das Budget prüfen will: coverage/index.html öffnen und
			//     die als `fstat-no` markierten Stellen ansehen — sie liegen alle auf einem
			//     `bind:`-Ziel, nie auf echtem Funktionsrumpf.
			// (b) Echter, aber über die öffentliche Komponenten-/Modul-API nie erreichbarer Defensiv-Code
			//     (z.B. `if (!container) return;` bei einem `bind:this`, das nie vor dem ersten Event
			//     ungebunden ist; ein `if (oldVersion < 3)`-Zweig, den `idb` laut eigener Semantik nie
			//     falsch aufruft; ein SSR-Guard, der im Browser-Testprojekt strukturell immer true ist).
			// (c) @vitest/coverage-v8-Merge-Artefakt im Browser-Modus bei vielen parallel laufenden
			//     Testdateien: db.svelte.test.ts erreicht isoliert 100%/93% (Funktionen/Branches),
			//     im Gesamtlauf werden für genau diese Datei jedoch auch triviale, nachweislich
			//     ausgeführte Top-Level-Statements (z.B. die Konstante DRAFT_MAX_AGE_MS) als nicht
			//     abgedeckt gemeldet, obwohl alle 21 Tests der Datei grün durchlaufen — reproduzierbar
			//     auch mit `--no-file-parallelism`, also kein echtes Test-/Isolationsproblem.
			//
			// WICHTIG: vitest wendet die globalen Thresholds unten IMMER auf die Gesamtsumme aller
			// Dateien an, auch wenn einzelne Dateien per Glob unten eigene (niedrigere) Werte haben —
			// die globalen Werte sind daher bewusst knapp unter dem aktuell tatsächlich erreichten
			// Gesamtwert gesetzt, nicht 100. Die Glob-Einträge sind zusätzliche, engere Regressions-Floors
			// für genau die betroffenen Dateien; jede Datei, die hier nicht explizit gelistet ist, bleibt
			// implizit bei 100% gefordert (jede Regression drückt sofort den Gesamtwert unter den Floor).
			thresholds: {
				lines: 99.2,
				branches: 88,
				functions: 97,
				statements: 98.2,
				'src/lib/components/Footer.svelte': { branches: 70 }, // (a) __APP_VERSION__ Vite-Define
				'src/lib/components/IncidentLocationFieldset.svelte': {
					statements: 91,
					branches: 65,
					functions: 82
				}, // (a) sieben `bind:value` an FormField/AddressAutocomplete
				'src/lib/components/InstallBanner.svelte': { branches: 85 }, // (a)
				'src/lib/components/PhotoLightbox.svelte': {
					statements: 95,
					branches: 80,
					lines: 95
				}, // (b) bind:this-Guards für container/dialog
				'src/lib/components/PhotoPool.svelte': { branches: 80 }, // (a)
				'src/lib/components/ProfileCard.svelte': {
					statements: 93,
					branches: 70,
					functions: 81
				}, // (a) sieben `bind:value` an FormField/AddressAutocomplete
				'src/lib/components/PullToRefresh.svelte': { statements: 95, branches: 90 }, // (a)+(b)
				'src/lib/components/ReportForm.svelte': { statements: 95, branches: 75 }, // (b) vier Defensiv-Guards, s. PR-Beschreibung
				'src/lib/components/VehicleBlock.svelte': {
					statements: 95,
					branches: 70,
					functions: 95,
					lines: 95
				}, // (a)+(b)
				'src/lib/components/VehicleDetailsFieldset.svelte': {
					statements: 96,
					branches: 50,
					functions: 91
				}, // (a) drei `bind:value` an FormField + Interpolation der VEHICLE_TYPES/VEHICLE_MAKES-Listen
				'src/lib/components/VehiclePreviewDialog.svelte': { branches: 80 }, // (a) Interpolation in Titel-/alt-Attributen
				'src/lib/components/icons/*.svelte': { branches: 0 }, // (a) $props()-Default
				'src/lib/history/db.ts': { statements: 88, branches: 88, functions: 85, lines: 88 }, // (b)+(c)
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
