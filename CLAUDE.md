# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektstatus

Dieses Repository enthält aktuell **nur den Auftrag** (`PROMPT.md`), aber noch keinen
Code — kein `package.json`, kein SvelteKit-Projekt, keine Tests. `PROMPT.md` ist die
verbindliche, vollständige Spezifikation für die PWA **"Knöllchen-Blitz"** (Meldung von
Falschparkern an die Bußgeldstelle Köln per E-Mail, MVP-Ziel: Meldung in unter 30 Sekunden
vom Smartphone aus).

**Bevor du irgendetwas implementierst:**

1. Lies `PROMPT.md` vollständig — sie enthält Zielsetzung, Nicht-Ziele (YAGNI), verbindliche
   Architekturentscheidungen, Tech-Stack, E-Mail-Vorlage, Teststrategie und Auftrag im Detail.
2. Prüfe, ob `PLAN.md` bereits existiert. Falls nicht: gemäß `PROMPT.md` Abschnitt 10 zuerst
   `PLAN.md` mit einem phasenweisen Implementierungsplan erstellen, danach eigenständig mit
   der Umsetzung fortfahren (kein Warten auf Rückfrage, außer bei echten Blockern —
   siehe `PROMPT.md` Abschnitt 12).
3. Sobald das SvelteKit-Projekt aufgesetzt ist, diese Datei um tatsächliche Kommandos
   (`dev`/`build`/`test`/`test:e2e`/`lint`/`check`) und die reale Ordnerstruktur ergänzen —
   die Vorgaben unten sind die verbindlichen Ziele aus `PROMPT.md`, nicht der Ist-Zustand.

> **Hinweis:** `PROMPT.md` wurde von einem ursprünglich Next.js/React-basierten Setup auf
> **SvelteKit** umgestellt (siehe Git-Historie). Diese Datei folgt dem aktuellen Stand von
> `PROMPT.md`. Falls du an eine ältere Next.js-Version dieses Dokuments gewöhnt bist: die
> Next.js-spezifischen Pfade/Begriffe (`app/api/.../route.ts`) sind überholt — verbindlich ist
> jetzt SvelteKit (`src/routes/.../+server.ts`).

## Verbindliche Architekturentscheidungen (aus PROMPT.md Abschnitt 3)

- **E-Mail-Versand:** Über `resend` (serverseitiger SvelteKit-Endpunkt
  `src/routes/api/send/+server.ts`, nie clientseitig). `from` = feste ENV-Absenderadresse,
  `reply_to` = Nutzer-E-Mail, `bcc` = Nutzer-E-Mail (Kopie ohne SMTP-Login-Risiko). Grund: Eine
  beliebige Nutzer-Adresse kann wegen SPF/DKIM/DMARC nicht als `From` dienen. Secrets über
  `$env/static/private` (bzw. `$env/dynamic/private`), niemals über `$env/*/public`, damit sie
  garantiert nicht ins Client-Bundle gelangen.
- **Reverse Geocoding:** Primär OpenStreetMap Nominatim über eigenen SvelteKit-Endpunkt
  `src/routes/api/geocode/+server.ts` (Usage Policy, korrekter `User-Agent`, Rate-Limit),
  Fallback auf BigDataCloud `reverse-geocode-client`. Scheitern beide: Adressfeld wird
  editierbar/Pflicht, GPS-Koords werden trotzdem mitgeschickt. Fehlender GPS-EXIF-Tag ist
  erwarteter Zustand, kein Fehler.
- **Lokale Historie:** IndexedDB via `idb` (kein Server-Storage) — Nachschlage-Komfort, keine
  dauerhafte Beweisquelle (das ist die abgeschickte E-Mail selbst); iOS kann Storage nach
  längerer Inaktivität evictieren. Nutzerprofil in `localStorage`.
- **Bildkompression:** Native Canvas API (`HTMLCanvasElement.toBlob`), keine zusätzliche
  Dependency.
- **PWA:** `@vite-pwa/sveltekit` (offizielles Vite/SvelteKit-PWA-Modul) statt handgeschriebenem
  Manifest/Service Worker — einfache Precache-Strategie für die App-Shell, kein komplexes
  Runtime-Caching. Ziel: Installierbarkeit (Android + iOS/Safari), Offline-Shell.
  iOS/Safari kennt kein `beforeinstallprompt` — bei Erkennung von iOS/Safari zeigt die App
  einen dezenten Banner-Hinweis ("Teilen → Zum Home-Bildschirm"), kein Modal.

## Tech-Stack (verbindlich, siehe PROMPT.md Abschnitt 4)

SvelteKit + TypeScript (`npx sv create`), Deployment auf Vercel (`@sveltejs/adapter-vercel`
bzw. `adapter-auto`), Styling **Tailwind CSS**, `resend`, `idb`, `exifr` (EXIF-Auslesen,
`DateTimeOriginal` + GPS), `@vite-pwa/sveltekit`, Vitest + `@testing-library/svelte` (Unit/
Komponenten), Playwright (E2E), ESLint + Prettier (inkl. `eslint-plugin-svelte`).

Kein zusätzliches Mocking-Framework (kein MSW) — Netzwerkaufrufe in Vitest über `vi.fn()`
mocken, in Playwright über `page.route()` abfangen. Kein externes State-Management — reicht
mit `svelte/store` bzw. Svelte-5-Runes.

**Jede zusätzliche Dependency muss explizit begründet werden** — vor Einführung prüfen, ob
Web-Standard-APIs (Canvas, Fetch, IndexedDB) ausreichen.

## Von React/Next.js zu SvelteKit

Dieses Projekt ist ein Umstieg von einem sonst React/Next.js-basierten Setup. Wichtige
SvelteKit-Konventionen, die für spätere Wartung ohne tiefe Svelte-Vorerfahrung relevant sind:

- **Dateibasiertes Routing:** `src/routes/**/+page.svelte` = Seite (analog zu Next.js
  `page.tsx`), `src/routes/**/+server.ts` = API-Endpunkt (analog zu Next.js Route Handlern,
  `app/api/.../route.ts`).
- **`load`-Funktionen** (`+page.ts`/`+page.server.ts`) übernehmen die Rolle von Server
  Components/`getServerSideProps` — Daten werden vor dem Rendern geladen und der Komponente
  als `data`-Prop übergeben.
- **Runes** (`$state`, `$derived`, `$effect` in Svelte 5) ersetzen React-Hooks
  (`useState`, `useMemo`, `useEffect`) für reaktiven State in `.svelte`-Dateien.
- **Env-Trennung:** `$env/static/private` (nur Server, nie im Bundle) vs.
  `$env/static/public` (auch Client) — bewusst strikter als Next.js' `NEXT_PUBLIC_`-Konvention.

## Geplante Ordnerstruktur (sobald das Projekt aufgesetzt ist)

| Pfad                                | Zweck                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`                       | Seiten (`+page.svelte`) und API-Endpunkte (`+server.ts`)                                                                               |
| `src/routes/api/send/+server.ts`    | Serverseitiger E-Mail-Versand über `resend`                                                                                            |
| `src/routes/api/geocode/+server.ts` | Reverse-Geocoding-Proxy (Nominatim + Fallback)                                                                                         |
| `src/lib/`                          | Framework-unabhängige Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding-Fallback, Validierung) — pure, unit-testbare Funktionen |
| `src/lib/config/cities.ts`          | Trennt Köln-spezifischen Text/Empfänger von generischer App-Logik (genau ein Eintrag `koeln`, siehe Mehrstädte-Fähigkeit unten)        |

## Mehrstädte-Fähigkeit (nicht bauen, nur nicht blockieren)

`src/lib/config/cities.ts` mit genau einem Eintrag `koeln` (Empfänger-Mail, Verstoßarten,
`buildEmailBody`) trennt Köln-spezifischen Text/Empfänger von generischer App-Logik — ohne
UI zur Stadtauswahl oder Mandantenfähigkeit zu bauen. Um hypothetisch eine weitere Stadt zu
ergänzen, würde man dort einen zweiten Eintrag mit eigenem `recipientEmail`/`incidentTypes`/
`buildEmailBody` hinzufügen — aktuell nicht umsetzen, siehe `PROMPT.md` Abschnitt 6.

## Umgebungsvariablen (siehe PROMPT.md Abschnitt 7)

```
RESEND_API_KEY=            # Resend API Key
EMAIL_FROM=                # z. B. onboarding@resend.dev (Testphase) oder verifizierte Domain
RECIPIENT_EMAIL=           # für Testzwecke: eigene E-Mail; später: bussgeldstelle@stadt-koeln.de
NOMINATIM_USER_AGENT=      # Pflicht-Header laut Nominatim Usage Policy, z. B. "knoellchen-blitz/1.0 (kontakt@example.com)"
```

Alle Variablen mit `.env.example` dokumentieren, niemals echte Werte committen. Serverseitige
Secrets ausschließlich über `$env/static/private` einbinden.

## Coding-Grundsätze für dieses Projekt

- KISS & DRY, keine vorzeitige Abstraktion (siehe Nicht-Ziele in `PROMPT.md` Abschnitt 2).
- Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding-Fallback, Validierung) als reine,
  unit-testbare Funktionen in `src/lib/`; `.svelte`-Komponenten dünn halten und primär für
  Markup/Bindings nutzen.
- Jeder externe Aufruf (Geocoding, E-Mail-Versand) braucht sichtbares Nutzer-Feedback bei
  Fehlern und Retry ohne Datenverlust (Formulardaten dürfen bei einem Fehler nicht verloren
  gehen).
- Tests parallel zur Implementierung schreiben, nicht erst am Ende (siehe Teststrategie in
  `PROMPT.md` Abschnitt 9).

## Rückfragen statt Improvisieren

Bei folgenden Punkten aus `PROMPT.md` Abschnitt 12 nachfragen statt selbst zu entscheiden:
Feinschliff des Tailwind-Designs (falls Lighthouse-relevant), Feinschliff des
E-Mail-Templates über den Vorschlag in Abschnitt 5 hinaus, unerwartete
Resend-Sandbox-Einschränkungen, unerwartete Konflikte zwischen `@vite-pwa/sveltekit` und dem
gewählten Vercel-Adapter.
