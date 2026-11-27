import { defineConfig } from '@vite-pwa/assets-generator/config';

// Einzige Quelle für die PWA-Icons. Zwei Leser:
// - `npm run build` erzeugt die PNGs vorher per CLI in `static/` (Script `prebuild`), von dort
//   übernimmt SvelteKit sie in den Build. @vite-pwa/sveltekit 2.0.4 erzeugt sie mit `withPwa`
//   beim Build nicht selbst: Es schreibt nur Manifest-Icons und <link>s.
// - vite.config.ts (`pwaAssets.config: true`) setzt daraus die Icons ins Manifest und die
//   <link>s in den <head>.
export default defineConfig({
	// Muss direkt in `static/` liegen (SvelteKits Pendant zu Vites `publicDir`): Die erzeugten
	// Dateien landen neben dem Bild und stehen root-relativ im Manifest.
	images: ['static/app-icon.svg'],
	// Eigenes Preset statt 'minimal-2023': Das Icon ist bereits randlos und quadratisch mit eigenem
	// Innenabstand, das Standard-Padding würde es zusätzlich verkleinern.
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
});
