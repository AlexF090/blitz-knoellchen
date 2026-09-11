# Implementierungsplan: Blitz-Knöllchen PWA

## Context

`PROMPT.md` ist der vollständige, verbindliche Auftrag für die PWA "Blitz-Knöllchen"
(Meldung von Falschparkern an die Bußgeldstelle Köln per E-Mail, MVP-Ziel: Meldung in
unter 30 Sekunden vom Smartphone aus). Stack: **SvelteKit + TypeScript + Tailwind CSS**
(siehe PROMPT.md Abschnitt 4).

## Phasen

### Phase 0 — Projekt-Setup & Tooling

- `npx sv create` im Repo-Root (TypeScript, Tailwind CSS, Vitest, `@testing-library/svelte`-Add-on, Playwright, ESLint, Prettier auswählen).
- `package.json` → `"name": "blitz-knoellchen"` sicherstellen.
- `npm install resend idb exifr @vite-pwa/sveltekit`.
- Adapter: `adapter-auto` (erkennt Vercel automatisch; reicht für MVP-Scope).
- `.env.example` mit `RESEND_API_KEY`, `EMAIL_FROM`, `RECIPIENT_EMAIL`, `NOMINATIM_USER_AGENT`; `.env` in `.gitignore`.
- Verzeichnisgerüst: `src/lib/config/`, `src/lib/email/`, `src/lib/exif/`, `src/lib/geocode/`, `src/lib/history/`, `src/lib/profile/`, `src/lib/image/`, `src/lib/validation/`, `src/lib/pwa/`, `src/routes/api/send/+server.ts`, `src/routes/api/geocode/+server.ts` (Platzhalter).
- Smoke-Test: `dev`, `build`, `check`, `lint`, `test`, `test:e2e` laufen grün.
- Commit: "chore: initial SvelteKit project setup".

### Phase 1 — PWA-Grundgerüst & App-Shell

- `@vite-pwa/sveltekit` konfigurieren: Manifest ("Blitz-Knöllchen"/"Blitz-Knöllchen" als short_name, Icons 192/512/maskable, `display: standalone`), `registerType: 'autoUpdate'`, App-Shell-Precache; `/api/*` explizit von Runtime-Caching ausschließen (`NetworkOnly`).
- `src/routes/+layout.svelte`: Tailwind global, PWA-Meta-Tags, `lang="de"`.
- `src/lib/pwa/isIosSafari.ts` + `src/lib/components/IosInstallBanner.svelte` (dezent, dismissable via `localStorage`).
  - Unit-Test: `isIosSafari.test.ts` mit mehreren UA-Fixtures.
- Platzhalter-Routen `src/routes/+page.svelte` (Formular) und `src/routes/historie/+page.svelte`.
- Commit: "feat: PWA shell, manifest, service worker, iOS install banner".

### Phase 2 — Formular-Grundgerüst & lokale Persistenz

- `src/lib/config/cities.ts`: `koeln`-Eintrag mit `incidentTypes`, `recipientEmail` über `$env/static/private`.
- `src/lib/email/buildEmailBody.ts`: reine Funktion nach Vorlage in PROMPT.md Abschnitt 5.
  - Unit-Tests: Normalfall, fehlendes Kennzeichen, fehlender Freitext, Sonderzeichen (ö/ä/ü/ß).
- `src/lib/validation/formSchema.ts`: handgeschriebene Validierung.
  - Unit-Tests: gültige Eingabe, fehlende Pflichtfelder, ungültige E-Mail.
- `src/lib/profile/profileStore.ts`: localStorage-Wrapper mit Svelte-5-Runes.
- `src/lib/history/db.ts`: `idb`-Wrapper (komprimiertes Foto-Thumbnail, kein Original).
- `src/lib/image/compress.ts`: Canvas-basierte `compressImage`.
- `src/lib/components/ReportForm.svelte` + `src/routes/+page.svelte`.
- `src/routes/historie/+page.svelte`.

### Phase 3 — EXIF & Reverse-Geocoding

- `src/lib/exif/parseExif.ts`: Wrapper um `exifr`, robust gegen fehlende Tags.
- `src/lib/geocode/reverseGeocode.ts`: Fallback-Logik (Nominatim → BigDataCloud → Fehler).
- `src/routes/api/geocode/+server.ts`: nutzt `reverseGeocode`, `User-Agent` aus ENV, Throttling.
- `src/lib/geocode/client.ts`: `fetchAddress(lat, lon)`.
- Integration ins Formular.

### Phase 4 — E-Mail-Versand

- `src/routes/api/send/+server.ts`: POST, FormData, Resend-Versand (from/to/reply_to/bcc/Attachment).
- Fehlerbehandlung + Client-Integration (Erfolg → Historie, Fehler → Formulardaten erhalten + Retry).

### Phase 5 — E2E-Tests (Playwright)

- Happy Path, Geocoding-Fallback, Send-Failure-preserves-data. Mobile-Viewport-Projekt.

### Phase 6 — Lighthouse-Feinschliff

- Production-Build, Lighthouse mobile, Optimierungen, Vorher/Nachher dokumentieren.

### Phase 7 — Dokumentation

- `CLAUDE.md` komplett neu schreiben, `README.md` erstellen.

## Querschnittsentscheidungen

- Svelte 5 Runes als primäres State-Pattern.
- Kein MSW: `vi.fn()`/`vi.mock()` bzw. `page.route()`.
- Tests parallel zur jeweiligen Phase.
- Originalfoto nur Richtung E-Mail-Anhang, nie Richtung eigenem Storage.

## Verifikation

- Nach jeder Phase: `npm run check && npm run lint && npm run test` grün.
- Nach Phase 5: `npm run test:e2e` grün.
- Nach Phase 6: Lighthouse-Report (mobile) dokumentiert.
