# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektstatus

Dieses Repository enthält aktuell **nur den Auftrag** (`PROMPT.md`), aber noch keinen
Code — kein `package.json`, kein Next.js-Projekt, keine Tests. `PROMPT.md` ist die
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
3. Sobald das Next.js-Projekt aufgesetzt ist, diese Datei um tatsächliche Kommandos
   (`dev`/`build`/`test`/`lint`) und die reale Ordnerstruktur ergänzen — die Vorgaben unten
   sind die verbindlichen Ziele aus `PROMPT.md`, nicht der Ist-Zustand.

## Verbindliche Architekturentscheidungen (aus PROMPT.md Abschnitt 3)

- **E-Mail-Versand:** Über `resend` (serverseitiger Next.js Route Handler
  `app/api/send/route.ts`, nie clientseitig). `from` = feste ENV-Absenderadresse, `reply_to`
  = Nutzer-E-Mail, `bcc` = Nutzer-E-Mail (Kopie ohne SMTP-Login-Risiko). Grund: Eine
  beliebige Nutzer-Adresse kann wegen SPF/DKIM/DMARC nicht als `From` dienen.
- **Reverse Geocoding:** Primär OpenStreetMap Nominatim über eigene Server-Route (Usage
  Policy, korrekter `User-Agent`, Rate-Limit), Fallback auf BigDataCloud
  `reverse-geocode-client`. Scheitern beide: Adressfeld wird editierbar/Pflicht, GPS-Koords
  werden trotzdem mitgeschickt. Fehlender GPS-EXIF-Tag ist erwarteter Zustand, kein Fehler.
- **Lokale Historie:** IndexedDB via `idb` (kein Server-Storage). Nutzerprofil in
  `localStorage`.
- **Bildkompression:** Native Canvas API (`HTMLCanvasElement.toBlob`), keine zusätzliche
  Dependency.
- **PWA:** Handgeschriebenes `manifest.json` + Service Worker statt schwerem PWA-Plugin, um
  Next.js-App-Router-Kompatibilität nicht zu riskieren.

## Tech-Stack (verbindlich, siehe PROMPT.md Abschnitt 4)

Next.js (App Router) + React + TypeScript, Deployment auf Vercel, `resend`, `idb`, `exifr`,
Styling CSS Modules oder Tailwind (Entscheidung offen, siehe Rückfrage-Kriterien),
Vitest + Testing Library (Unit), Playwright (E2E), ESLint + Prettier.

**Jede zusätzliche Dependency muss explizit begründet werden** — vor Einführung prüfen, ob
Web-Standard-APIs (Canvas, Fetch, IndexedDB) ausreichen.

## Mehrstädte-Fähigkeit (nicht bauen, nur nicht blockieren)

`config/cities.ts` mit genau einem Eintrag `koeln` (Empfänger-Mail, Verstoßarten,
`buildEmailBody`) trennt Köln-spezifischen Text/Empfänger von generischer App-Logik — ohne
UI zur Stadtauswahl oder Mandantenfähigkeit zu bauen. Siehe `PROMPT.md` Abschnitt 6.

## Coding-Grundsätze für dieses Projekt

- KISS & DRY, keine vorzeitige Abstraktion (siehe Nicht-Ziele in `PROMPT.md` Abschnitt 2).
- Business-Logik (E-Mail-Template, EXIF-Parsing, Geocoding-Fallback, Validierung) als reine,
  unit-testbare Funktionen; Komponenten dünn halten.
- Jeder externe Aufruf (Geocoding, E-Mail-Versand) braucht sichtbares Nutzer-Feedback bei
  Fehlern und Retry ohne Datenverlust.
- Tests parallel zur Implementierung schreiben, nicht erst am Ende (siehe Teststrategie in
  `PROMPT.md` Abschnitt 9).

## Rückfragen statt Improvisieren

Bei folgenden Punkten aus `PROMPT.md` Abschnitt 12 nachfragen statt selbst zu entscheiden:
Tailwind vs. reines CSS (falls Lighthouse-relevant), Feinschliff des E-Mail-Templates über
den Vorschlag in Abschnitt 5 hinaus, unerwartete Resend-Sandbox-Einschränkungen.
