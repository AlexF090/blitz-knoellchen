# CLAUDE.md

Anleitung für Claude Code (claude.ai/code) in diesem Repository.

## Projektüberblick

**Knöllchen-Blitz** ist eine Progressive Web App, mit der Falschparker der Bußgeldstelle Köln
per E-Mail gemeldet werden können ("Fremdanzeige"). Zielgruppe: Menschen, die spontan im
Alltag ein falsch geparktes Auto sehen und es in unter 30 Sekunden vom Smartphone aus melden
wollen, ohne eine native Mail-App zu öffnen. Ablauf: Foto machen → App liest Datum/GPS aus den
EXIF-Daten aus und ermittelt per Reverse-Geocoding eine Adresse → Verstoßart wählen → Absenden
verschickt eine fertig formulierte E-Mail; die Anzeige erscheint danach in einer lokalen
Historie. Der vollständige Auftrag mit allen Details steht in `PROMPT.md`.

## Architekturentscheidungen (ADRs)

### E-Mail-Versand über Resend, nie clientseitig

Eine beliebige, vom Nutzer eingegebene E-Mail-Adresse kann technisch nicht als `From` dienen
(SPF/DKIM/DMARC würden das als Spoofing werten). Der Versand läuft daher über den
Transactional-Email-Dienst **Resend** und ausschließlich über den serverseitigen Endpunkt
`src/routes/api/send/+server.ts` — der API-Key darf nie ins Client-Bundle gelangen.
`from` ist eine feste, per ENV konfigurierte Adresse; `reply_to` und `bcc` sind die vom Nutzer
eingegebene E-Mail-Adresse (löst "Kopie im eigenen Postfach", ohne dass eine Nutzer-Adresse
oder ein Passwort je den Server verlässt bzw. gebraucht wird).

### Reverse Geocoding über einen eigenen Server-Proxy mit Fallback-Kette

Primär **OpenStreetMap Nominatim** (kostenlos, kein Key), proxied über
`src/routes/api/geocode/+server.ts` statt direkt vom Client — nötig, um die Nominatim Usage
Policy einzuhalten (`User-Agent`-Pflicht-Header, max. 1 Request/Sekunde serverseitig
gedrosselt). Schlägt Nominatim fehl, springt der Server automatisch auf **BigDataCloud**
(`src/lib/geocode/reverseGeocode.ts`, providerbasiert und dadurch unabhängig testbar). Scheitern
beide, wird das Adressfeld im Formular editierbar/Pflicht; ein fehlender GPS-EXIF-Tag ist ein
erwarteter Zustand (sofortige manuelle Eingabe), kein Fehler.

### Lokale Historie in IndexedDB, kein Server-Storage

Versendete Anzeigen werden clientseitig über `idb` (`src/lib/history/db.ts`) in IndexedDB
gespeichert — Nachschlage-Komfort, keine dauerhafte Beweisquelle (das ist die abgeschickte
E-Mail selbst). iOS kann diesen Storage nach längerer Inaktivität evictieren. Es wird nur ein
komprimiertes Foto-Thumbnail gespeichert, nie das Originalfoto. Das Nutzerprofil (Name,
Adresse, E-Mail) liegt separat in `localStorage` (`src/lib/profile/profileStore.svelte.ts`),
damit es beim nächsten Öffnen sofort vorausgefüllt ist.

### Bildkompression über native Canvas API

Vor dem Versand wird das Foto über `HTMLCanvasElement`/`toBlob` verkleinert
(`src/lib/image/compress.ts`) — bewusst ohne zusätzliche Dependency, da Web-Standard-APIs
ausreichen und das die Payload unter dem Vercel-Function-Limit hält.

### PWA über `@vite-pwa/sveltekit`

Manifest und Service Worker laufen über das offizielle Vite/SvelteKit-PWA-Modul statt über
handgeschriebene Konfiguration (`vite.config.ts`). Die Strategie ist bewusst simpel gehalten:
App-Shell wird vorgecacht, `/api/*` ist explizit `NetworkOnly` (Geocoding/Send dürfen nie
gecacht werden). iOS/Safari kennt kein `beforeinstallprompt` — bei Erkennung
(`src/lib/pwa/isIosSafari.ts`) zeigt `IosInstallBanner.svelte` einen dezenten, dismissable
Hinweis ("Teilen → Zum Home-Bildschirm") statt eines Modals.

## Ordnerstruktur

| Pfad                                     | Zweck                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`                | Formular-Seite (bindet `ReportForm.svelte` ein)                                           |
| `src/routes/historie/+page.svelte`       | Liste bereits versendeter Anzeigen aus IndexedDB                                          |
| `src/routes/api/send/+server.ts`         | Serverseitiger E-Mail-Versand über Resend                                                 |
| `src/routes/api/geocode/+server.ts`      | Reverse-Geocoding-Proxy (Nominatim + BigDataCloud-Fallback, Throttling)                   |
| `src/lib/components/`                    | Svelte-Komponenten (`ReportForm.svelte`, `IosInstallBanner.svelte`) — dünn, primär Markup |
| `src/lib/config/cities.ts`               | Client-sicherer Städte-Katalog (`incidentTypes`, `buildEmailBody`), **kein** Env-Import   |
| `src/lib/config/cities.server.ts`        | Serverseitige Empfänger-Zuordnung (`$env/static/private`), getrennt von `cities.ts`       |
| `src/lib/email/buildEmailBody.ts`        | Reine Funktion: Formulardaten → E-Mail-Betreff/-Text                                      |
| `src/lib/exif/parseExif.ts`              | Wrapper um `exifr`, robust gegen fehlende/korrupte EXIF-Tags                              |
| `src/lib/geocode/reverseGeocode.ts`      | Providerbasierte Fallback-Logik, unabhängig von SvelteKit testbar                         |
| `src/lib/geocode/client.ts`              | Ruft `/api/geocode` vom Client aus auf                                                    |
| `src/lib/history/db.ts`                  | `idb`-Wrapper für die lokale Historie                                                     |
| `src/lib/profile/profileStore.svelte.ts` | `localStorage`-Wrapper mit Svelte-5-Runes                                                 |
| `src/lib/image/compress.ts`              | Canvas-basierte Bildkompression                                                           |
| `src/lib/pwa/isIosSafari.ts`             | Reine, testbare UA-Erkennung für den iOS-Install-Hinweis                                  |
| `src/lib/validation/formSchema.ts`       | Handgeschriebene Formular-Validierung                                                     |
| `e2e/`                                   | Playwright-Tests + `fixtures/photo-with-gps.jpg` (EXIF-Testbild)                          |
| `scripts/`                               | Einmalige Setup-Skripte (Icon-Generierung, EXIF-Fixture-Generierung) — nicht Teil der App |

## Kommandos

```bash
npm run dev          # Dev-Server
npm run build         # Production-Build
npm run preview        # Production-Build lokal ansehen
npm run check           # svelte-check (Typprüfung)
npm run lint             # Prettier --check + ESLint
npm run format            # Prettier --write
npm run test:unit          # Vitest (Unit- + Komponententests, Node- und Browser-Projekt)
npm run test:e2e            # Playwright (installiert Browser, baut + startet die App)
npm run test                  # test:unit + test:e2e
```

## Coding-Konventionen

- Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding-Fallback, Validierung,
  Bildkompression) liegt als reine, framework-unabhängige Funktion in `src/lib/` und wird ohne
  Rendering-Overhead per Vitest getestet. `.svelte`-Dateien bleiben dünn: Markup, Bindings,
  Aufruf der `src/lib/`-Funktionen.
- Svelte 5 Runes (`$state`, `$derived`) statt `svelte/store` für reaktiven State — kein
  externes State-Management nötig.
- `interface` für Objektformen, `type` nur für Union/Intersection; `import type` für reine
  Typ-Importe.
- Kein Mocking-Framework (kein MSW): Netzwerkaufrufe in Vitest über `vi.fn()`/`vi.mock()`,
  in Playwright über `page.route()`.
- Jede zusätzliche Dependency muss begründet werden — vor dem Hinzufügen prüfen, ob
  Web-Standard-APIs (Canvas, Fetch, IndexedDB) ausreichen.
- Jeder externe Aufruf (Geocoding, E-Mail-Versand) braucht sichtbares Nutzer-Feedback bei
  Fehlern; Formulardaten dürfen bei einem Fehlschlag nicht verloren gehen (siehe
  `ReportForm.svelte`: Fehlerpfad behält den State, kein Reset).

## Weitere Stadt hinzufügen (hypothetisch, aktuell nicht umgesetzt)

Aktuell ist ausschließlich Köln aktiv, aber die Struktur blockiert eine spätere Erweiterung
nicht:

1. In `src/lib/config/cities.ts` einen zweiten Eintrag im `CITIES`-Record ergänzen (`id`,
   `label`, `incidentTypes`, `buildEmailBody`).
2. In `src/lib/config/cities.server.ts` die zugehörige Empfänger-E-Mail in
   `RECIPIENT_EMAILS` ergänzen (eigene ENV-Variable, da `$env/static/private` nur
   serverseitig importierbar ist).
3. Keine UI zur Stadtauswahl bauen, solange nicht explizit gefordert — das ist bewusst
   außerhalb des aktuellen Scopes (YAGNI).

## Umgebungsvariablen

| Variable               | Zweck                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`       | API-Key für den E-Mail-Versand über Resend.                                             |
| `EMAIL_FROM`           | Feste Absenderadresse (Resend-Sandbox-Adresse oder verifizierte Domain).                |
| `RECIPIENT_EMAIL`      | Empfänger der Anzeige-Mail (Testphase: eigene Adresse; Produktion: Bußgeldstelle Köln). |
| `NOMINATIM_USER_AGENT` | Pflicht-`User-Agent`-Header für Nominatim-Anfragen laut dessen Usage Policy.            |

Immer über `.env.example` dokumentieren, echte Werte nie committen. Serverseitige Secrets
ausschließlich über `$env/static/private` einbinden (siehe `cities.server.ts`,
`api/send/+server.ts`, `api/geocode/+server.ts`), niemals über `$env/*/public`.

## Umstieg von React/Next.js

Dieses Projekt ist technisch ein Umstieg von einem ursprünglich React/Next.js-basierten Setup
auf SvelteKit. Wichtige Entsprechungen für die Wartung ohne tiefe Svelte-Vorerfahrung:

- **Dateibasiertes Routing:** `src/routes/**/+page.svelte` entspricht Next.js'
  `app/**/page.tsx`; `src/routes/**/+server.ts` entspricht einem Next.js Route Handler
  (`app/api/.../route.ts`).
- **`load`-Funktionen** (`+page.ts`/`+page.server.ts`) übernehmen die Rolle von Server
  Components/`getServerSideProps`: Daten werden vor dem Rendern geladen und der Komponente als
  `data`-Prop übergeben. In diesem Projekt wird das aktuell nicht gebraucht — Formular und
  Historie laden clientseitig (IndexedDB ist ohnehin nur im Browser verfügbar).
- **Runes** (`$state`, `$derived`, `$effect`) ersetzen React-Hooks (`useState`, `useMemo`,
  `useEffect`) für reaktiven State in `.svelte`- bzw. `.svelte.ts`-Dateien.
- **Env-Trennung:** `$env/static/private` (nur Server, nie im Bundle) vs.
  `$env/static/public` (auch Client) — strikter als Next.js' `NEXT_PUBLIC_`-Konvention; ein
  versehentlicher Client-Import von `$env/static/private` schlägt beim Build fehl statt still
  Secrets zu leaken (Grund für die Trennung `cities.ts`/`cities.server.ts`).

## Bekannte Tooling-Einschränkung

Lighthouse ≥ v12 hat die eigenständige PWA-Kategorie entfernt (kein Score mehr dafür). Die
PWA-Anforderungen aus `PROMPT.md` Abschnitt 8 werden stattdessen manuell verifiziert: Manifest
unter `/manifest.webmanifest` (Name, Icons 192/512/maskable, `display: standalone`) und
Service-Worker-Generierung beim Build (`@vite-pwa/sveltekit`, siehe Build-Output).
