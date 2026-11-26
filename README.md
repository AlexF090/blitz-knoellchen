# Blitz-Knöllchen

[![CI](https://github.com/AlexF090/blitz-knoellchen/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexF090/blitz-knoellchen/actions/workflows/ci.yml)

Progressive Web App, mit der sich Falschparker in rund 30 Sekunden vom Smartphone aus bei der
Bußgeldstelle Köln anzeigen lassen — Foto machen, Rest füllt sich selbst aus, absenden.

**→ [Live-Demo](https://blitz-knoellchen.appool.de)**

<table>
  <tr>
    <td width="25%"><img src="docs/screenshots/01-formular.png" alt="Leeres Anzeigeformular" /></td>
    <td width="25%"><img src="docs/screenshots/02-vorgang-ausgefuellt.png" alt="Vorgang mit Foto, automatisch ermittelter Adresse und Fahrzeugdaten" /></td>
    <td width="25%"><img src="docs/screenshots/03-email-vorschau.png" alt="Vorschau der E-Mail an die Bußgeldstelle" /></td>
    <td width="25%"><img src="docs/screenshots/05-historie.png" alt="Historie bereits versendeter Anzeigen" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Anzeige starten</sub></td>
    <td align="center"><sub>Auto-Fill aus dem Foto</sub></td>
    <td align="center"><sub>Vorschau vor dem Versand</sub></td>
    <td align="center"><sub>Lokale Historie</sub></td>
  </tr>
</table>

## Warum die App existiert

Die Stadt Köln hat für Fremdanzeigen ein
[Online-Formular](https://formular-server.de/Koeln_FS/findform?shortname=32-F68_AnzVerkOrdWi&formtecid=3&areashortname=send_html).
Es funktioniert, aber es ist für genau einen Vorgang gebaut: Wer drei falsch geparkte Autos in
einer Straße meldet, füllt es dreimal komplett aus — jedes Mal inklusive der eigenen
Kontaktdaten, des Tatorts, von Datum und Uhrzeit. Auf dem Smartphone, im Stehen, neben dem Auto.

Blitz-Knöllchen dreht diesen Ablauf um:

- **Mehrere Vorgänge in einem Durchgang.** Fotos landen in einem gemeinsamen Pool und werden
  Fahrzeugen zugeordnet. Jedes Fahrzeug wird als eigene Anzeige verschickt — durchnummeriert, damit
  die Sachbearbeitung die Vorgänge auseinanderhalten kann — aber es ist nur _ein_ Ausfüllvorgang.
- **Die eigenen Daten werden einmal eingegeben.** Danach liegen sie im Gerät und füllen jede
  weitere Anzeige automatisch vor.
- **Tatort und Zeitpunkt kommen aus dem Foto.** Aufnahmedatum und GPS-Position stehen in den
  EXIF-Daten; die Adresse ermittelt die App per Reverse-Geocoding. Getippt werden muss nur noch,
  was das Foto nicht hergibt: Kennzeichen, Fahrzeugart, Farbe, Verstoßart.
- **Kein Medienbruch.** Keine Mail-App, kein manuelles Anhängen von Fotos, kein Abtippen von
  Koordinaten.

## Ablauf in der App

1. **Foto aufnehmen oder auswählen.** Aufnahmedatum und GPS-Position werden aus den EXIF-Daten
   gelesen — auch bei iPhone-HEIC-Fotos, die dafür clientseitig zu JPEG konvertiert werden.
2. **Adresse per Reverse-Geocoding.** Aus den Koordinaten ermittelt die App Straße, Hausnummer,
   PLZ und Ort. Fehlt das GPS-Tag oder schlägt das Geocoding fehl, wird das Adressfeld editierbar
   (mit Autocomplete beim Nachbessern).
3. **Verstoß erfassen.** Eine oder mehrere Verstoßarten, Halte- oder Parkverstoß (inklusive der
   Mindestparkzeit-Regel), Kennzeichen, Fahrzeugart, Marke und Farbe, optional das Ausmaß der
   Behinderung und gefährdete Personen. Ein angefangener Entwurf bleibt bis zu sieben Tage lokal
   gespeichert; beim nächsten Öffnen lässt er sich fortsetzen oder verwerfen.
4. **Vorschau und Absenden.** Die fertige E-Mail lässt sich vor dem Versand ansehen. Verschickt
   wird sie serverseitig über Brevo, mit komprimiertem Foto im Anhang, in das Datum und GPS wieder
   eingebettet werden. Der Melder bekommt automatisch eine Kopie.
5. **Historie.** Versendete Anzeigen liegen lokal auf dem Gerät (IndexedDB) inklusive Thumbnail —
   nachschlagbar, ohne dass je ein Server sie speichert.

Die App ist als installierbare PWA gebaut und verhält sich vom Homescreen aus wie eine native App.

## Tech-Stack

| Bereich      | Technologie                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- |
| Framework    | SvelteKit 3, Svelte 5 (Runes-Modus), TypeScript im `strict`-Modus                           |
| Styling      | Tailwind CSS 4, Design-Tokens ausschließlich in `oklch()`                                   |
| Tests        | Vitest (Node- + echtes Browser-Projekt), Playwright (Desktop und Mobile)                    |
| Daten        | IndexedDB über `idb` — keine serverseitige Datenhaltung                                     |
| Externe APIs | Brevo (E-Mail-Versand), Geoapify (Geocoding, EU-Endpunkt)                                   |
| Build/Deploy | Vite 8, `@sveltejs/adapter-cloudflare` (Cloudflare Workers), PWA über `@vite-pwa/sveltekit` |

Sieben Runtime-Dependencies insgesamt — jede einzelne ist in den Architekturentscheidungen
begründet. Die 12 ADRs, die Ordnerstruktur und die Coding-Konventionen stehen in
[`docs/architektur.md`](./docs/architektur.md).

### Umsetzungsdetails

- **Kein Mocking-Framework.** E2E-Tests laufen gegen einen selbst geschriebenen Brevo-Mock
  (`e2e/mocks/brevo-mock-server.mjs`), sodass der echte Versand-Endpunkt inklusive Validierung und
  E-Mail-Aufbau durchlaufen wird — ohne dass eine Mail das Haus verlässt.
- **Ein Netzwerk-Guard in den E2E-Fixtures** lässt jeden nicht explizit gemockten externen Request
  den Test hart fehlschlagen — keine falsch-grünen Tests durch echte API-Aufrufe.
- **Coverage-Thresholds als Regressions-Floor**, mit datei-spezifischen Ausnahmen, die jeweils
  begründen, warum ein Zweig strukturell nicht erreichbar ist (`vite.config.ts`).
- **CSP ohne `unsafe-inline` für Skripte** über SvelteKits `kit.csp`, inklusive dokumentierter
  Begründung, warum Trusted Types hier (noch) nicht aktiviert ist.

## Demo- und Live-Modus

Die App startet im **Live-Modus**: Die Anzeige geht tatsächlich an die Bußgeldstelle. Über das
Modus-Badge im Header lässt sich in den **Demo-Modus** wechseln, dann geht die Anzeige nur an eine
interne Test-Adresse. Ein Wechsel gilt pro Browser-Session. Welcher Empfänger dahintersteht, entscheidet ausschließlich der Server — der
Client schickt nur `demo` oder `live`, und ein fehlender oder manipulierter Wert fällt immer auf
`demo` zurück.

## Voraussetzungen

- Node.js 26 und npm ≥ 11.17 (Version in [`.nvmrc`](./.nvmrc), mit nvm: `nvm use`)
- Ein [Brevo](https://brevo.com)-Account (das kostenlose Kontingent reicht zum Ausprobieren)
- Ein [Geoapify](https://www.geoapify.com)-Account (kostenlos, 3.000 Anfragen/Tag)

## Setup

```bash
npm install
cp .env.example .env
```

`.env` mit echten Werten füllen (siehe [Umgebungsvariablen](#umgebungsvariablen)). Die Datei steht
in `.gitignore` und darf nie committet werden.

### Brevo einrichten

1. Account auf [brevo.com](https://brevo.com) anlegen, API-Key erzeugen (Settings → SMTP & API →
   API Keys) → `BREVO_API_KEY`.
2. `EMAIL_FROM` muss eine Adresse einer **selbst besessenen Domain** sein, die in Brevo unter
   „Senders & IPs → Domains" per SPF-/DKIM-DNS-Records authentifiziert wurde. Anders als bei
   manchen Anbietern gibt es keine kostenlose Sandbox-Absenderadresse. Eine fremde Adresse
   (Gmail, GMX, iCloud …) funktioniert nicht: ohne eigenen DNS-Zugriff scheitert die
   DMARC-Alignment-Prüfung bei strengen Empfängern. Begründung im ADR „E-Mail-Versand über Brevo"
   in [`docs/architektur.md`](./docs/architektur.md).
3. `RECIPIENT_EMAIL_DEMO` auf eine eigene Test-Adresse setzen, `RECIPIENT_EMAIL_LIVE` auf die
   tatsächliche Adresse der Bußgeldstelle (`bussgeldstelle@stadt-koeln.de`).

### Geoapify einrichten

Account auf [myprojects.geoapify.com](https://myprojects.geoapify.com) anlegen, ein Projekt
erstellen und dessen API-Key als `GEOAPIFY_API_KEY` eintragen. Der kostenlose Tarif erlaubt 3.000
Anfragen pro Tag bei 5 Anfragen pro Sekunde und verlangt einen sichtbaren Link „Powered by
Geoapify“ (steht im Footer). Die App nutzt den EU-Endpunkt `api-eu.geoapify.com`.

Schlägt Geoapify fehl, gibt der Nutzer die Adresse von Hand ein; beim Autocomplete bleibt die
Vorschlagsliste leer.

## Entwicklung

```bash
npm run dev         # Dev-Server
npm run check       # Typprüfung (svelte-check)
npm run lint        # Prettier --check + ESLint
npm run format      # Prettier --write
npm run test:unit   # Vitest (Unit- und Komponententests)
npm run test:e2e    # Playwright (baut und startet die App automatisch)
npm run test        # test:unit + test:e2e
npm run build       # Production-Build
npm run preview     # gebauten Worker lokal in workerd starten (wrangler dev)
```

Ein Husky-Pre-Commit-Hook lässt `lint-staged` laufen (Prettier, ESLint mit `--fix`, Typprüfung).
Der Pre-Push-Hook führt die Unit-Tests mit Coverage-Schwellen aus (`npm run test:unit -- --run --coverage`).
Die README-Screenshots erzeugt `npm run screenshots` reproduzierbar aus dem Production-Build —
gegen denselben Brevo-Mock wie die E2E-Tests, mit frei erfundenen Testdaten.

## Deployment auf Cloudflare Workers

Das Projekt nutzt `@sveltejs/adapter-cloudflare` explizit statt `adapter-auto`. Worker-Name,
Bindings (Rate-Limits) und Custom Domain stehen in `wrangler.jsonc`.

1. Das Repository ist im Cloudflare-Dashboard über Workers Builds verbunden: Jeder Push auf
   `main` baut mit `npm run build` und deployt mit `npx wrangler deploy`. Preview-Builds sind aus.
2. Die fünf Pflicht-Variablen aus der Tabelle unten als Secrets am Worker setzen
   (`npx wrangler secret put <NAME>` oder Dashboard → Settings → Variables and Secrets). Sie
   werden zur Laufzeit gelesen, Build-Variablen braucht es nicht. `BREVO_API_URL` und
   `SEND_LIMIT_PER_MINUTE` aus `.env.example` sind nur für E2E-Tests gedacht und gehören nicht
   nach Cloudflare.
3. Von Hand deployen geht weiterhin mit `npx wrangler login` und
   `npm run build && npx wrangler deploy`. `*.workers.dev` ist abgeschaltet
   (`workers_dev: false`), die App ist nur unter der Produktionsdomain erreichbar.
4. Produktionsdomain ist `https://blitz-knoellchen.appool.de` (Custom Domain am Worker; die Zone
   `appool.de` liegt bei Cloudflare). Canonical,
   `og:url`, JSON-LD und Sitemap nutzen diese feste Origin aus `src/lib/site.ts`, nicht den
   Hostnamen der Anfrage. `EMAIL_FROM` ist in Produktion `blitz-knoellchen@appool.de`; die Domain
   `appool.de` muss dafür in Brevo authentifiziert sein.
5. Das Impressum liegt zentral auf [appool.de/impressum](https://appool.de/impressum);
   `/impressum` leitet per 301 dorthin.

## Umgebungsvariablen

| Variable               | Zweck                                                           |
| ---------------------- | --------------------------------------------------------------- |
| `BREVO_API_KEY`        | API-Key für den E-Mail-Versand über Brevo                       |
| `EMAIL_FROM`           | Feste Absenderadresse (in Brevo authentifizierte eigene Domain) |
| `RECIPIENT_EMAIL_DEMO` | Empfänger im Demo-Modus (eigene Test-Adresse)                   |
| `RECIPIENT_EMAIL_LIVE` | Empfänger im Live-Modus (Bußgeldstelle Köln)                    |
| `GEOAPIFY_API_KEY`     | API-Key für Reverse-Geocoding und Adress-Autocomplete           |

## Installation auf dem Smartphone

**Android (Chrome):** Beim Öffnen erscheint automatisch ein Install-Banner. Alternativ über das
Chrome-Menü (⋮) → „App installieren".

**iOS/iPadOS (Safari):** iOS kennt kein automatisches Install-Prompt, daher zeigt die App einen
Hinweis-Banner am unteren Rand: „Teilen" (⬆️) → „Zum Home-Bildschirm". Das funktioniert **nur in
Safari**, nicht in Chrome oder Firefox auf iOS.

## Sicherheit

Schwachstellen bitte nicht als öffentliches Issue melden — siehe [`SECURITY.md`](./SECURITY.md).

## Lizenz

Siehe [`LICENSE`](./LICENSE) — alle Rechte vorbehalten. Der Quelltext ist zur Einsichtnahme
öffentlich zugänglich; Nutzungs-, Kopier- oder Weiterentwicklungsrechte werden damit nicht
eingeräumt.

## Asset-Attribution

- `static/signs/zeichen-283-halteverbot.svg`, `static/signs/zeichen-286-parkverbot.svg` — amtliche
  StVO-Verkehrszeichen (Zeichen 283 „Haltverbot", Zeichen 286 „Eingeschränktes Haltverbot").
- Schriftart [Archivo](https://fonts.google.com/specimen/Archivo) über
  [`@fontsource/archivo`](https://www.npmjs.com/package/@fontsource/archivo), lizenziert unter der
  [SIL Open Font License 1.1](https://openfontlicense.org/).
