// Erzeugt das Vorschaubild für geteilte Links (Open Graph, 1200×630) nach `static/og-image.png`.
// Aufruf: `npm run og-image`
//
// Playwright statt einer Bildbibliothek: Chromium rendert die Wortmarke mit der echten
// Archivo-Schrift, ohne zusätzliche Dependency. Messenger zeigen kein SVG als Vorschaubild,
// deshalb wird das PNG erzeugt und versioniert.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'static/og-image.png');
const WIDTH = 1200;
const HEIGHT = 630;

const [appIcon, archivoFont] = await Promise.all([
	readFile(path.join(ROOT, 'static/app-icon.svg'), 'utf8'),
	readFile(path.join(ROOT, 'node_modules/@fontsource/archivo/files/archivo-latin-800-normal.woff2'))
]);

// Farbwerte entsprechen --color-surface, --color-ink, --color-ink-muted und --color-primary-600
// (Light Mode) aus src/routes/layout.css.
const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
	@font-face {
		font-family: 'Archivo';
		font-weight: 800;
		src: url(data:font/woff2;base64,${archivoFont.toString('base64')}) format('woff2');
	}
	html, body { margin: 0; }
	body {
		width: ${WIDTH}px;
		height: ${HEIGHT}px;
		display: flex;
		align-items: center;
		gap: 72px;
		padding: 0 96px;
		box-sizing: border-box;
		background: oklch(100% 0 0);
		border-bottom: 24px solid oklch(42.99% 0.0572 185.34);
		font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
	.icon svg { display: block; width: 300px; height: 300px; border-radius: 64px; }
	.wordmark {
		font-family: 'Archivo', sans-serif;
		font-weight: 800;
		font-size: 104px;
		line-height: 0.95;
		letter-spacing: -0.02em;
	}
	.wordmark span { display: block; }
	.ink { color: oklch(25.77% 0.0094 173.48); }
	.primary { color: oklch(42.99% 0.0572 185.34); }
	.claim {
		margin: 32px 0 0;
		font-size: 36px;
		line-height: 1.3;
		color: oklch(44% 0.0155 159.5);
	}
</style>
</head>
<body>
	<div class="icon">${appIcon}</div>
	<div>
		<div class="wordmark"><span class="ink">BLITZ</span><span class="primary">KNÖLLCHEN</span></div>
		<p class="claim">Falschparker in rund 30 Sekunden an die Bußgeldstelle Köln melden.</p>
	</div>
</body>
</html>`;

const browser = await chromium.launch();
try {
	const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
	await page.setContent(html);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: OUTPUT_FILE });
	console.log(`Vorschaubild geschrieben: ${path.relative(ROOT, OUTPUT_FILE)}`);
} finally {
	await browser.close();
}
