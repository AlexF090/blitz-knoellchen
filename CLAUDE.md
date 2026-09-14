# CLAUDE.md

Kurzanleitung für Claude Code in diesem Repository. Vollständige Architekturentscheidungen
(ADRs), Ordnerstruktur und Umgebungsvariablen: siehe [`docs/architektur.md`](./docs/architektur.md).

## Kommandos

```bash
npm run dev          # Dev-Server
npm run build         # Production-Build
npm run check           # svelte-check (Typprüfung)
npm run lint             # Prettier --check + ESLint
npm run format            # Prettier --write
npm run test:unit          # Vitest (Unit- + Komponententests)
npm run test:e2e            # Playwright (baut + startet die App automatisch)
```

## Wichtigste Konventionen

- Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding, Validierung, Bildkompression) liegt
  als reine, framework-unabhängige Funktion in `src/lib/`, testbar ohne Rendering. `.svelte`-
  Dateien bleiben dünn: Markup, Bindings, Aufruf der `src/lib/`-Funktionen.
- Svelte 5 Runes (`$state`, `$derived`) statt `svelte/store`.
- `interface` für Objektformen, `type` nur für Union/Intersection; `import type` für reine
  Typ-Importe; kein `any` ohne Begründung.
- Farben ausschließlich als `oklch()` — kein `#hex`/`rgb()`/`hsl()`/benannte CSS-Farben.
- Jede zusätzliche Dependency muss begründet werden — vor dem Hinzufügen prüfen, ob
  Web-Standard-APIs ausreichen.

Details, ADRs und die vollständige Ordnerstruktur-Tabelle: [`docs/architektur.md`](./docs/architektur.md).
