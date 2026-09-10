# Master-Prompt für Claude Code: "Knöllchen-Blitz" PWA (Köln)

> **Hinweis zur Nutzung:** Diese Datei ist der vollständige Auftrag für Claude Code. Lege sie im
> Projekt-Root als `PROMPT.md` ab und gib Claude Code den Auftrag: _"Lies PROMPT.md und erstelle
> zunächst einen Implementierungsplan in PLAN.md, bevor du mit der Umsetzung beginnst."_

## 0. Projektname

Das Projekt heißt **Knöllchen-Blitz**. Dieser Name ist verbindlich zu verwenden für:

- `package.json` → `"name": "knoellchen-blitz"` (ASCII-Slug, ö → oe)
- Repository-/Ordnername: `knoellchen-blitz`
- PWA-Manifest: `"name": "Knöllchen-Blitz"`, `"short_name": "Knöllchen-Blitz"` (kürzen falls
  Zeichenlimit für Homescreen-Icons es erfordert, z. B. "Knöllchen")
- Titel in `README.md` und `CLAUDE.md`

---

## 1. Kontext

Falschparker können der Bußgeldstelle der Stadt Köln formlos per E-Mail gemeldet werden
("Fremdanzeige"). Der aktuelle Weg (Web-Formular der Stadt oder manuelle Mail) ist für den
Alltag zu langsam, wenn man spontan unterwegs ein falsch geparktes Auto sieht. Ziel ist eine
Progressive Web App (PWA), mit der eine Anzeige **in unter 30 Sekunden** vom Smartphone aus
abgeschickt werden kann — ohne dass eine native Mail-App geöffnet werden muss.

## 2. Zielsetzung (MVP)

Der Nutzer:

1. Öffnet die installierte PWA (Homescreen-Icon).
2. Macht ein Foto oder wählt eins aus der Galerie.
3. Die App liest **Datum/Uhrzeit** und **GPS-Position** automatisch aus den EXIF-Daten des
   Fotos aus und wandelt die Position per Reverse-Geocoding in eine lesbare Adresse um.
4. Der Nutzer wählt nur noch kurz die **Art des Verstoßes** aus (Dropdown) und bestätigt/
   korrigiert die vorausgefüllten Felder.
5. Ein Tap auf "Absenden" verschickt eine fertig formulierte E-Mail an die Bußgeldstelle.
6. Die Anzeige erscheint in einer lokalen Historie (offline verfügbar) und der Nutzer erhält
   eine Kopie der Mail in sein eigenes Postfach.

**Hinweis für iPhone-Nutzer (UI-Anforderung):** Da iOS kein automatisches Install-Prompt
(`beforeinstallprompt`) kennt und "Zum Home-Bildschirm hinzufügen" nur über Safari (nicht
Chrome/Firefox auf iOS) funktioniert, muss die App bei Erkennung von iOS/Safari einen kurzen,
unaufdringlichen Hinweis anzeigen ("Tippe auf Teilen → Zum Home-Bildschirm, um die App zu
installieren"). Kein Modal, kein Aufdringlichkeits-Overlay — ein dezenter Banner reicht.

**Nicht-Ziele für das MVP** (bewusst nicht bauen — YAGNI):

- Keine Nutzerkonten/Login, keine Server-Datenbank mit personenbezogenen Daten.
- Keine Städte-Auswahl-UI — nur Köln ist aktiv, aber die Code-Struktur darf eine spätere
  Erweiterung nicht blockieren (siehe Abschnitt 6).
- Kein automatisches Tracking/Analytics.
- Keine Bildspeicherung auf einem Server — Fotos werden nur durchgereicht, nie persistiert.

## 3. Verbindliche Architekturentscheidungen

Diese Entscheidungen sind bereits getroffen und **nicht** zur Diskussion — sie sollen in
`CLAUDE.md` als "Architecture Decision Record" kurz begründet dokumentiert werden:

### 3.1 E-Mail-Versand

- **Problem:** Eine beliebige, vom Nutzer eingegebene E-Mail-Adresse kann technisch nicht
  als `From`-Adresse verwendet werden (SPF/DKIM/DMARC würden das als Spoofing blocken oder
  in Spam einsortieren). Passwort-/App-Passwort-Abfrage vom Nutzer ist aus Sicherheitsgründen
  ausgeschlossen.
- **Lösung:** Versand über einen Transactional-Email-API-Dienst (empfohlen: **Resend**, da
  offizielle Vercel-Integration, großzügiges Gratis-Kontingent, minimale SDK-Größe).
  - `from`: feste, per ENV konfigurierte Absenderadresse (verifizierte Domain bzw. für die
    Testphase die Resend-Sandbox-Adresse).
  - `reply_to`: die vom Nutzer im Formular eingegebene E-Mail-Adresse.
  - `bcc`: ebenfalls die Nutzer-E-Mail, damit er automatisch eine Kopie in seinem eigenen
    Postfach hat (löst "sehe ich im eigenen Postfach", ohne SMTP-Login-Risiko).
  - Der Versand läuft über einen serverseitigen SvelteKit-Endpunkt
    (`src/routes/api/send/+server.ts`), niemals clientseitig (API-Key darf nie im Browser
    landen — SvelteKit trennt das über `$env/static/private` klar vom Client-Bundle).

### 3.2 Reverse Geocoding (Foto-GPS → Adresse)

- Primär: **OpenStreetMap Nominatim** (kostenlos, kein API-Key). Muss über einen eigenen
  SvelteKit-Server-Endpunkt (`src/routes/api/geocode/+server.ts`) proxied werden (niemals
  direkt vom Client), um:
  - die Nominatim Usage Policy einzuhalten (korrekter `User-Agent`-Header, max. 1 Request/Sekunde),
  - serverseitig einfaches Request-Throttling/Caching zu ermöglichen.
- **Fallback-Kette:** Wird das Rate-Limit erreicht oder schlägt Nominatim fehl, automatisch
  einen zweiten kostenlosen, key-losen Dienst versuchen (z. B. BigDataCloud
  `reverse-geocode-client`, CORS-freundlich, großzügiges Kontingent).
- Schlagen **beide** Dienste fehl: klare Fehlermeldung im UI ("Adresse konnte nicht automatisch
  ermittelt werden — bitte manuell eintragen") und das Adressfeld wird editierbar/pflicht,
  GPS-Koordinaten werden trotzdem als Fallback-Info mitgeschickt.
- Fehlt der GPS-EXIF-Tag komplett (kein Standort in der Foto-Metadaten): sofort auf manuelle
  Eingabe hinweisen, kein Fehler, sondern erwarteter Zustand.

### 3.3 Lokale Historie

- Bereits versendete Anzeigen werden clientseitig in **IndexedDB** gespeichert (kein
  Server-Storage), sichtbar als einfache Liste in der App. Für IndexedDB-Zugriff eine
  minimale Wrapper-Bibliothek verwenden (empfohlen: `idb`, ~1 KB, reiner Promise-Wrapper —
  kein ORM, kein schweres Tooling). Hinweis: iOS kann Storage nach längerer App-Inaktivität
  evictieren — die Historie ist ein "Nachschlage-Komfort", keine dauerhafte Beweisquelle
  (das ist die abgeschickte E-Mail selbst).
- Nutzerprofil (Vorname, Nachname, Adresse, E-Mail) wird einmalig erfasst und in
  `localStorage` gehalten, damit es beim nächsten Öffnen sofort vorausgefüllt ist.

### 3.4 Bildkompression

- Vor dem Upload wird das Foto clientseitig über die native **Canvas API** verkleinert/
  komprimiert (keine zusätzliche Dependency dafür einführen — das ist mit Bordmitteln
  (`HTMLCanvasElement.toBlob`) lösbar und hält die Payload unter dem Vercel-Function-Limit).

### 3.5 PWA

- Manifest und Service Worker über **`@vite-pwa/sveltekit`** (offizielles, gut gepflegtes
  PWA-Modul im Vite/SvelteKit-Ökosystem) einrichten, statt komplett handzuschreiben — das
  ist hier die schlankere und robustere Wahl, da es sich nahtlos in Vite integriert und
  Cache-Strategien (App-Shell offline verfügbar) mit wenig Konfiguration abdeckt.
  Service-Worker-Strategie so simpel wie möglich halten (precache der App-Shell, kein
  komplexes Runtime-Caching, das nicht gebraucht wird).
- Ziel: Installierbarkeit (Homescreen, Android + iOS/Safari), Offline-Shell (App startet
  auch ohne Netz, der eigentliche Versand braucht natürlich Netz).

## 4. Tech-Stack (verbindlich, minimal)

- **SvelteKit** + **TypeScript** (bei `npx sv create` als Option auswählen)
- **Styling:** **Tailwind CSS** (ebenfalls direkt bei `npx sv create` einrichtbar)
- **Deployment:** Vercel (`@sveltejs/adapter-vercel` bzw. `adapter-auto`)
- **E-Mail:** `resend` (SDK)
- **IndexedDB:** `idb`
- **EXIF-Auslesen:** `exifr` (schlank, tree-shakeable, liest `DateTimeOriginal` + GPS)
- **PWA:** `@vite-pwa/sveltekit`
- **Tests:**
  - **Vitest** (+ `@testing-library/svelte`) für Unit-/Komponententests — läuft ohne
    Zusatzaufwand, da SvelteKit ohnehin auf Vite basiert
  - **Playwright** für End-to-End-Tests (bei `npx sv create` direkt mit einrichtbar,
    inkl. fertiger Config, die den Dev-Server automatisch startet)
  - Kein zusätzliches Mocking-Framework (kein MSW) — Netzwerkaufrufe in Vitest über `vi.fn()`
    mocken, in Playwright über `page.route()` abfangen
- **Linting/Formatting:** ESLint + Prettier (SvelteKit-Defaults inkl. `eslint-plugin-svelte`
  reichen)

**Grundsatz:** Jede zusätzliche Dependency muss explizit begründet werden. Bevor eine neue
Bibliothek eingeführt wird: prüfen, ob es mit Web-Standard-APIs (Canvas, Fetch, IndexedDB)
oder mit `svelte/store` bzw. Svelte-5-Runes lösbar ist, statt eine externe State-Management-
Bibliothek einzuführen (wird für den Scope dieser App nicht gebraucht).

## 5. E-Mail-Vorlage

Grundgerüst (wird noch iterativ verfeinert, aber als Ausgangspunkt verbindlich):

```
Betreff: Anzeige einer Verkehrsordnungswidrigkeit (Falschparken)

Sehr geehrte Damen und Herren,

hiermit zeige ich, {Vorname} {Nachname}, wohnhaft in {Straße Hausnummer, PLZ Ort}, an,
dass am {Datum} um {Uhrzeit} Uhr in der {Straße Hausnummer/Anhaltspunkt}, {PLZ} Köln,
folgender Parkverstoß vorlag:

Art des Verstoßes: {Verstoßart}
Kennzeichen des Fahrzeugs: {Kennzeichen, falls erfasst}
Weitere Angaben: {Freitext, optional}

Ein Beweisfoto ist dieser E-Mail beigefügt.

Ich stehe für Rückfragen und ggf. als Zeuge zur Verfügung und bin unter dieser E-Mail-Adresse
erreichbar.

Mit freundlichen Grüßen
{Vorname} {Nachname}
```

Das Template soll als reine Funktion (`buildEmailBody(input): string`) in `src/lib/`
implementiert und per Unit-Test abgedeckt werden — komplett unabhängig von Svelte-Komponenten,
damit es ohne Rendering-Overhead getestet werden kann.

## 6. Struktur für spätere Mehrstädte-Fähigkeit (nicht bauen, nur nicht blockieren)

Es ist noch **nicht entschieden**, ob und wie das auf andere Städte skalieren soll. Damit
das später keine Rewrite erfordert, aber ohne heute unnötige Komplexität einzubauen:

- Eine Konfigurationsdatei `src/lib/config/cities.ts` mit **genau einem Eintrag** `koeln`:
  ```ts
  {
    id: "koeln",
    label: "Köln",
    recipientEmail: RECIPIENT_EMAIL, // aus $env/static/private, env-gesteuert für Testphase
    incidentTypes: [...],
    buildEmailBody: (input) => string,
  }
  ```
- Keine UI zur Stadtauswahl, keine Mandantenfähigkeit, keine Datenbank — nur die Trennung
  von "Köln-spezifischem Text/Empfänger" und "generischer App-Logik", damit ein zweiter
  Eintrag später ohne größere Umbauten ergänzt werden könnte.

## 7. Umgebungsvariablen

```
RESEND_API_KEY=            # Resend API Key
EMAIL_FROM=                # z. B. onboarding@resend.dev (Testphase) oder verifizierte Domain
RECIPIENT_EMAIL=           # für Testzwecke: meine eigene E-Mail; später: bussgeldstelle@stadt-koeln.de
NOMINATIM_USER_AGENT=      # Pflicht-Header laut Nominatim Usage Policy, z. B. "knoellchen-blitz/1.0 (kontakt@example.com)"
```

Alle Variablen mit `.env.example` dokumentieren, niemals echte Werte committen. Serverseitige
Secrets ausschließlich über `$env/static/private` (bzw. `$env/dynamic/private`) einbinden,
niemals über `$env/*/public`, damit sie garantiert nicht ins Client-Bundle gelangen.

## 8. Nicht-funktionale Anforderungen

- **Lighthouse:** Ziel ≥ 95 in Performance, Accessibility, Best Practices, SEO, PWA — auf
  Mobile getestet (das ist der Haupt-Use-Case: "im Vorbeigehen"). SvelteKits kompilierter
  Output ohne Framework-Runtime-Overhead soll hier gezielt ausgenutzt werden (keine schweren
  Client-Libraries "just in case" einbinden).
- **Accessibility:** Formularfelder mit korrekten Labels, ausreichend Kontrast, Tastatur-
  bedienbar.
- **KISS & DRY:** keine vorzeitige Abstraktion, keine über-generischen Interfaces für Dinge,
  die aktuell nur einen Fall haben (siehe Abschnitt 6).
- **Fehlerbehandlung:** jeder externe Aufruf (Geocoding, E-Mail-Versand) braucht sichtbares
  Nutzer-Feedback bei Fehlern (kein stiller Fehlschlag), inkl. Retry-Möglichkeit ohne Datenverlust
  (Formulardaten dürfen bei einem Fehler nicht verloren gehen).

## 9. Teststrategie (verbindlich)

- **Unit-Tests (Vitest):**
  - E-Mail-Template-Funktion (verschiedene Eingaben, Sonderzeichen, fehlende optionale Felder)
  - EXIF-Parsing-Wrapper (Mock-Dateien: mit GPS, ohne GPS, ohne Datum)
  - Geocoding-Fallback-Logik (Nominatim erfolgreich / Rate-Limit / beide Dienste down)
  - Formular-Validierung
- **Komponententests (Vitest + `@testing-library/svelte`):**
  - Formular-Komponente: automatisches Befüllen der Felder nach Foto-Auswahl, Pflichtfeld-
    Validierung bei fehlender Adresse
- **E2E-Tests (Playwright):**
  - Happy Path: Profil ausfüllen → Foto auswählen (Fixture-Bild mit EXIF) → Felder werden
    automatisch befüllt → Verstoßart wählen → Absenden → Erfolgsmeldung → Eintrag erscheint
    in der Historie
  - Fehlerfall: Geocoding schlägt fehl → manuelles Adressfeld wird angezeigt und ist Pflicht
  - Fehlerfall: E-Mail-Versand schlägt fehl (Route gemockt) → Formulardaten bleiben erhalten
- Test-Coverage ist kein Selbstzweck — Fokus auf die oben genannten kritischen Pfade statt
  100 % Coverage um jeden Preis.

## 10. Dein Auftrag an Claude Code

1. Lies diesen gesamten Prompt sorgfältig.
2. Erstelle **zuerst** eine Datei `PLAN.md` mit einem konkreten, in Phasen/Meilensteine
   gegliederten Implementierungsplan (z. B.: Projekt-Setup → PWA-Grundgerüst → Formular &
   lokale Persistenz → EXIF/Geocoding → E-Mail-Versand → Tests → Lighthouse-Feinschliff →
   Dokumentation). Warte an dieser Stelle **nicht** auf Rückfrage, sondern fahre danach
   direkt mit der Umsetzung laut Plan fort, es sei denn, es gibt einen echten Blocker
   (siehe Punkt 12).
3. Setze das Projekt via `npx sv create` gemäß Abschnitt 4 auf (SvelteKit + TypeScript +
   Tailwind + Vitest + Playwright, minimale zusätzliche Dependencies).
4. Implementiere entlang des Plans, committe in sinnvollen, nachvollziehbaren Schritten.
5. Schreibe Tests parallel zur Implementierung, nicht erst am Ende.
6. Erstelle eine ausführliche `CLAUDE.md` (siehe Abschnitt 11).
7. Erstelle eine ausführliche `README.md` für Menschen (Setup, ENV-Variablen, lokale
   Entwicklung, Deployment auf Vercel, wie man Resend/Nominatim einrichtet, Installations-
   Hinweis für iOS/Android).
8. Prüfe am Ende den Lighthouse-Score (mobile) und optimiere nachweisbar nach.

## 11. Anforderungen an CLAUDE.md

Muss enthalten:

- Kurzer Projektüberblick (was macht die App, für wen)
- Die Architekturentscheidungen aus Abschnitt 3 als kurze "Decision + Begründung"-Liste
- Ordnerstruktur mit Kurzbeschreibung der wichtigsten Verzeichnisse/Dateien (`src/routes`,
  `src/lib`, `src/lib/config`, etc.)
- Verfügbare Kommandos (`dev`, `build`, `test`, `test:e2e`, `lint`, `check`)
- Coding-Konventionen (z. B. reine, framework-unabhängige Funktionen in `src/lib/` für
  Business-Logik, `.svelte`-Komponenten dünn halten und primär für Markup/Bindings nutzen)
- Kurze Anleitung "Wie füge ich (hypothetisch) eine weitere Stadt hinzu" (Verweis auf
  `src/lib/config/cities.ts`), ohne dass das aktuell umgesetzt wird
- Liste aller ENV-Variablen mit Erklärung
- Kurzer Hinweis, dass dies ein Umstieg von einem sonst React/Next.js-basierten Setup ist —
  SvelteKit-spezifische Konventionen (Dateibasiertes Routing über `+page.svelte`/`+server.ts`,
  `load`-Funktionen, Runes) kurz einordnen, damit spätere Wartung auch ohne tiefe
  Svelte-Vorerfahrung möglich ist.

## 12. Wann du Rückfragen stellen darfst

Fahre eigenständig fort, außer bei echten Entscheidungen, die dieser Prompt offen lässt,
insbesondere:

- Feinschliff des Tailwind-Designs, falls das den Lighthouse-Score relevant beeinflusst
- Konkrete Formulierung/Feinschliff des E-Mail-Templates über den Vorschlag in Abschnitt 5 hinaus
- Falls Resend in der Praxis unerwartete Einschränkungen für den Testfall zeigt (z. B.
  Sandbox-Adresse erlaubt nur Versand an die eigene verifizierte Adresse) — dann kurz
  Alternativen vorschlagen statt einfach zu improvisieren.
- Falls `@vite-pwa/sveltekit` in der Praxis unerwartete Konflikte mit dem gewählten
  Vercel-Adapter zeigt — dann kurz Alternativen (z. B. handgeschriebener Service Worker)
  vorschlagen statt stillschweigend zu improvisieren.

Alles andere: eigenständig nach bestem Urteilsvermögen entscheiden und im Zweifel die
einfachere, KISS-konforme Lösung wählen.
