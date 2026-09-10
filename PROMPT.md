# Master-Prompt für Claude Code: "Knöllchen-Blitz" PWA (Köln)

> **Hinweis zur Nutzung:** Diese Datei ist der vollständige Auftrag für Claude Code. Lege sie im
> Projekt-Root als `PROMPT.md` ab und gib Claude Code den Auftrag: *"Lies PROMPT.md und erstelle
> zunächst einen Implementierungsplan in PLAN.md, bevor du mit der Umsetzung beginnst."*

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
  - Der Versand läuft über eine serverseitige Next.js Route Handler (`app/api/send/route.ts`),
    niemals clientseitig (API-Key darf nie im Browser landen).

### 3.2 Reverse Geocoding (Foto-GPS → Adresse)
- Primär: **OpenStreetMap Nominatim** (kostenlos, kein API-Key). Muss über eine eigene
  Server-Route proxied werden (niemals direkt vom Client), um:
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
  kein ORM, kein schweres Tooling).
- Nutzerprofil (Vorname, Nachname, Adresse, E-Mail) wird einmalig erfasst und in
  `localStorage` gehalten, damit es beim nächsten Öffnen sofort vorausgefüllt ist.

### 3.4 Bildkompression
- Vor dem Upload wird das Foto clientseitig über die native **Canvas API** verkleinert/
  komprimiert (keine zusätzliche Dependency dafür einführen — das ist mit Bordmitteln
  (`HTMLCanvasElement.toBlob`) lösbar und hält die Payload unter dem Vercel-Function-Limit).

### 3.5 PWA
- Manifest (`manifest.json`) und Service Worker so einfach wie möglich, bevorzugt handgeschrieben
  statt eines schweren PWA-Plugins, um Kompatibilität mit dem Next.js App Router nicht zu
  riskieren und Dependencies gering zu halten. Ziel: Installierbarkeit (Homescreen), Offline-Shell
  (App startet auch ohne Netz, Versand selbst braucht natürlich Netz).

## 4. Tech-Stack (verbindlich, minimal)

- **Next.js** (App Router) + **React** + **TypeScript**
- **Deployment:** Vercel
- **E-Mail:** `resend` (SDK)
- **IndexedDB:** `idb`
- **EXIF-Auslesen:** `exifr` (schlank, tree-shakeable, liest `DateTimeOriginal` + GPS)
- **Styling:** einfaches CSS (CSS Modules oder Tailwind — wähle die Option mit weniger
  zusätzlichem Tooling-Overhead; Tailwind ist ok, wenn es den Lighthouse-Score nicht belastet)
- **Tests:**
  - **Vitest** (+ `@testing-library/react`) für Unit-/Komponententests
  - **Playwright** für End-to-End-Tests
  - Kein zusätzliches Mocking-Framework (kein MSW) — Netzwerkaufrufe in Vitest über `vi.fn()`
    mocken, in Playwright über `page.route()` abfangen
- **Linting/Formatting:** ESLint + Prettier (Next.js-Defaults reichen)

**Grundsatz:** Jede zusätzliche Dependency muss explizit begründet werden. Bevor eine neue
Bibliothek eingeführt wird: prüfen, ob es mit Web-Standard-APIs (Canvas, Fetch, IndexedDB)
lösbar ist.

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

Das Template soll als reine Funktion (`buildEmailBody(input): string`) implementiert und
per Unit-Test abgedeckt werden.

## 6. Struktur für spätere Mehrstädte-Fähigkeit (nicht bauen, nur nicht blockieren)

Es ist noch **nicht entschieden**, ob und wie das auf andere Städte skalieren soll. Damit
das später keine Rewrite erfordert, aber ohne heute unnötige Komplexität einzubauen:

- Eine Konfigurationsdatei `config/cities.ts` mit **genau einem Eintrag** `koeln`:
  ```ts
  {
    id: "koeln",
    label: "Köln",
    recipientEmail: process.env.RECIPIENT_EMAIL, // env-gesteuert für Testphase
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
NOMINATIM_USER_AGENT=      # Pflicht-Header laut Nominatim Usage Policy, z. B. "parkverstoss-koeln-app/1.0 (kontakt@example.com)"
```

Alle Variablen mit `.env.example` dokumentieren, niemals echte Werte committen.

## 8. Nicht-funktionale Anforderungen

- **Lighthouse:** Ziel ≥ 95 in Performance, Accessibility, Best Practices, SEO, PWA — auf
  Mobile getestet (das ist der Haupt-Use-Case: "im Vorbeigehen").
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
3. Setze das Projekt gemäß Abschnitt 4 auf (Next.js + TypeScript, minimale Dependencies).
4. Implementiere entlang des Plans, committe in sinnvollen, nachvollziehbaren Schritten.
5. Schreibe Tests parallel zur Implementierung, nicht erst am Ende.
6. Erstelle eine ausführliche `CLAUDE.md` (siehe Abschnitt 11).
7. Erstelle eine ausführliche `README.md` für Menschen (Setup, ENV-Variablen, lokale
   Entwicklung, Deployment auf Vercel, wie man Resend/Nominatim einrichtet).
8. Prüfe am Ende den Lighthouse-Score (mobile) und optimiere nachweisbar nach.

## 11. Anforderungen an CLAUDE.md

Muss enthalten:
- Kurzer Projektüberblick (was macht die App, für wen)
- Die Architekturentscheidungen aus Abschnitt 3 als kurze "Decision + Begründung"-Liste
- Ordnerstruktur mit Kurzbeschreibung der wichtigsten Verzeichnisse/Dateien
- Verfügbare Kommandos (`dev`, `build`, `test`, `test:e2e`, `lint`)
- Coding-Konventionen (z. B. reine Funktionen für Business-Logik, Komponenten dünn halten)
- Kurze Anleitung "Wie füge ich (hypothetisch) eine weitere Stadt hinzu" (Verweis auf
  `config/cities.ts`), ohne dass das aktuell umgesetzt wird
- Liste aller ENV-Variablen mit Erklärung

## 12. Wann du Rückfragen stellen darfst

Fahre eigenständig fort, außer bei echten Entscheidungen, die dieser Prompt offen lässt,
insbesondere:
- Tailwind vs. reines CSS, falls das den Lighthouse-Score relevant beeinflusst
- Konkrete Formulierung/Feinschliff des E-Mail-Templates über den Vorschlag in Abschnitt 5 hinaus
- Falls Resend in der Praxis unerwartete Einschränkungen für den Testfall zeigt (z. B.
  Sandbox-Adresse erlaubt nur Versand an die eigene verifizierte Adresse) — dann kurz
  Alternativen vorschlagen statt einfach zu improvisieren.

Alles andere: eigenständig nach bestem Urteilsvermögen entscheiden und im Zweifel die
einfachere, KISS-konforme Lösung wählen.
