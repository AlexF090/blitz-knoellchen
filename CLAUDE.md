# CLAUDE.md

Kurzanleitung für Claude Code in diesem Repository. Vollständige Architekturentscheidungen
(ADRs), Ordnerstruktur und Umgebungsvariablen: siehe [`docs/architektur.md`](./docs/architektur.md).

## Kommandos

Node-Version steht in `.nvmrc` (`nvm use`); `engine-strict` bricht den Install bei zu altem Node ab.

```bash
npm run dev                            # Dev-Server
npm run build                          # Production-Build
npm run preview                        # Production-Build lokal ansehen
npm run check                          # svelte-check (Typprüfung)
npm run lint                           # Prettier --check + ESLint
npm run format                         # Prettier --write
npm run test:unit                      # Vitest (Unit- + Komponententests)
npm run test:unit -- --run --coverage  # wie die CI, inklusive Coverage-Thresholds
npm run test:e2e                       # Playwright (baut + startet die App automatisch)
npm run test                           # test:unit + test:e2e
npm run screenshots                    # README-Screenshots aus dem Production-Build
```

## Wichtigste Konventionen

- Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding, Validierung, Bildkompression) liegt
  als reine, framework-unabhängige Funktion in `src/lib/`, testbar ohne Rendering. `.svelte`-
  Dateien bleiben dünn: Markup, Bindings, Aufruf der `src/lib/`-Funktionen.
- Svelte 5 Runes (`$state`, `$derived`) statt `svelte/store`.
- `interface` für Objektformen, `type` nur für Union/Intersection; `import type` für reine
  Typ-Importe; kein `any` ohne Begründung.
- Farben ausschließlich als `oklch()` — kein `#hex`/`rgb()`/`hsl()`/benannte CSS-Farben. Einzige
  Ausnahme sind die Hintergrundfarben der Icon-Erzeugung (`pwaAssets` in `vite.config.ts`): Sie
  sind Eingaben für die Bildverarbeitung, keine Styles.
- Tailwind: `size-5` statt `h-5 w-5`, wenn Höhe und Breite gleich sind.
- Jede zusätzliche Dependency muss begründet werden — vor dem Hinzufügen prüfen, ob
  Web-Standard-APIs ausreichen.
- Kommentare auf Deutsch: JSDoc beschreibt das _Was_, Inline-Kommentare das _Warum_ des aktuellen
  Stands — keine Vorgeschichte, die gehört in die Commit-Message. Details
  unter „Coding-Konventionen" in `docs/architektur.md`.
- Commits auf Deutsch im Conventional-Commits-Format (`feat`, `fix`, `chore`, `refactor`, `docs`,
  `test`, `ci`). Der Pre-Commit-Hook führt Prettier, ESLint und `npm run check` aus.

## Tests (Vitest 5)

- Zwei Projekte: `*.svelte.test.ts` läuft in echtem Chromium (Komponenten, Browser-APIs),
  `*.test.ts` in Node.
- `render()` und `unmount()` aus `vitest-browser-svelte` sind async — immer `await`.
- `toHaveTextContent` prüft den **vollständigen** Text. Für Teilstrings `toMatchTextContent`;
  sonst ist z.B. `.not.toHaveTextContent('(')` immer grün, ohne etwas zu prüfen.
- Text-Locator (`getByLabelText`, `getByText`) matchen per Teilstring, weil `locators.exact: false`
  in `vite.config.ts` gesetzt ist. `getByLabelText('Uhrzeit')` findet so auch „Uhrzeit \*".
- Coverage-Thresholds sind ein Regressions-Floor. Nicht senken, damit ein Test grün wird;
  datei-spezifische Ausnahmen nur mit Begründung im Kommentarblock in `vite.config.ts`.

## Fallstricke

- `$env/static/private` wird zur **Build-Zeit** in den Server-Code eingebacken, nicht zur
  Laufzeit gelesen. Echte Werte aus der lokalen `.env` stecken damit in jedem lokalen Build — so
  wäre fast eine private Adresse in den README-Screenshots gelandet. Deshalb überschreibt
  `npm run screenshots` die Adressen schon beim Build.
- Install-Skripte laufen nur für die versionsgenauen Einträge in `allowScripts` (`package.json`);
  `strict-allow-scripts` in `.npmrc` lässt den Install sonst mit `ESTRICTALLOWSCRIPTS` scheitern.
  Ändert sich die Version eines dort gelisteten Pakets (auch per Dependabot), muss der Eintrag
  mitgezogen werden: `npm install-scripts approve` bzw. `npm install-scripts prune`.

Details, ADRs und die vollständige Ordnerstruktur-Tabelle: [`docs/architektur.md`](./docs/architektur.md).
