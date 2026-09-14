# Architektur

Vollständige Architekturentscheidungen (ADRs), Ordnerstruktur und Umgebungsvariablen für
Blitz-Knöllchen. Kurzreferenz mit Kommandos und den wichtigsten Konventionen:
[`../CLAUDE.md`](../CLAUDE.md).

## Projektüberblick

**Blitz-Knöllchen** ist eine Progressive Web App, mit der Falschparker der Bußgeldstelle Köln
per E-Mail gemeldet werden können ("Fremdanzeige"). Zielgruppe: Menschen, die spontan im
Alltag ein falsch geparktes Auto sehen und es in unter 30 Sekunden vom Smartphone aus melden
wollen, ohne eine native Mail-App zu öffnen. Ablauf: Foto machen → App liest Datum/GPS aus den
EXIF-Daten aus und ermittelt per Reverse-Geocoding eine Adresse → Verstoßart wählen → Absenden
verschickt eine fertig formulierte E-Mail; die Anzeige erscheint danach in einer lokalen
Historie.

## Architekturentscheidungen (ADRs)

### E-Mail-Versand über Brevo, nie clientseitig

Eine beliebige, vom Nutzer eingegebene E-Mail-Adresse kann technisch nicht als `From` dienen
(SPF/DKIM/DMARC würden das als Spoofing werten). Der Versand läuft daher über den
Transactional-Email-Dienst **Brevo** (EU-Anbieter, DSGVO-konform) und ausschließlich über den
serverseitigen Endpunkt `src/routes/api/send/+server.ts` — der API-Key darf nie ins
Client-Bundle gelangen. Brevo wird bewusst per `fetch` gegen die REST-API
(`https://api.brevo.com/v3/smtp/email`) angesprochen statt über das `@getbrevo/brevo`-SDK, da
Web-Standard-APIs für den einzelnen Sende-Call ausreichen (siehe Coding-Konvention zu
Dependencies). `from`/`sender` ist eine feste, per ENV konfigurierte Adresse; `replyTo` und
`bcc` sind die vom Nutzer eingegebene E-Mail-Adresse (löst "Kopie im eigenen Postfach", ohne
dass eine Nutzer-Adresse oder ein Passwort je den Server verlässt bzw. gebraucht wird).

**`EMAIL_FROM` muss eine in Brevo domain-authentifizierte Adresse sein, keine private
Adresse eines fremden Großanbieters.** Ursprünglich stand hier testweise eine private
`@icloud.com`-Adresse — Brevo meldete den Versand trotzdem als `delivered` (SMTP-Annahme durch
den Empfänger-Server), Proton Mail zeigte die Mail dem Empfänger aber mit der Warnung "Diese
E-Mail hat die Domain-Authentifizierungsanforderungen nicht bestanden" an bzw. ließ sie in
anderen Fällen (GMX, freenet.de) gar nicht erst ankommen. Grund: Große Provider wie
`icloud.com` haben eine strikte DMARC-Policy; da Brevos sendende IPs nicht als autorisierter
Absender für eine fremde Domain SPF-/DKIM-aligned sein können, scheitert die
DMARC-Alignment-Prüfung beim Empfänger nach der SMTP-Annahme — für Brevo selbst unsichtbar
(daher weiterhin `delivered` im Log), für den Empfänger aber als Spoofing-Verdacht sichtbar
oder die Mail wird kommentarlos verworfen. `EMAIL_FROM` muss daher auf eine selbst besessene
Domain zeigen, die in Brevo unter Senders & IPs → Domains per SPF-/DKIM-DNS-Records
authentifiziert wurde — keine Adresse bei Apple/Google/Microsoft/GMX/freenet o.ä.

### Reverse Geocoding über einen eigenen Server-Proxy mit Fallback-Kette

Primär **LocationIQ** (API-kompatibel zu Nominatim, gleiche Datenbasis/Genauigkeit,
hausnummer-genau; kostenloser Tarif: 5.000 Requests/Tag, 2 Req/Sekunde), proxied über
`src/routes/api/geocode/+server.ts` statt direkt vom Client — der API-Key darf nie ins
Client-Bundle gelangen, außerdem serverseitig auf 1 Req/Sekunde gedrosselt (deutlich unter
LocationIQs Limit). Ursprünglich wurde hier die öffentliche **Nominatim**-Demo-Instanz
(`nominatim.openstreetmap.org`, kostenlos, kein Key) genutzt; die blockt laut eigener Usage
Policy aber alles, was nach mehr als Gelegenheitsnutzung aussieht, aktiv mit `403 Access
denied` — im Praxistest reproduzierbar. LocationIQ ersetzt sie deshalb als primären Provider.
Schlägt LocationIQ fehl, springt der Server automatisch auf **BigDataCloud** (kein Key nötig,
liefert aber nur orts-/stadtteilgenaue statt hausnummer-genaue Adressen;
`src/lib/geocode/reverseGeocode.ts`, providerbasiert und dadurch unabhängig testbar). Scheitern
beide, wird das Adressfeld im Formular editierbar/Pflicht; ein fehlender GPS-EXIF-Tag ist ein
erwarteter Zustand (sofortige manuelle Eingabe), kein Fehler.

`/api/geocode` liefert eine strukturierte `GeocodeAddress` (`street`/`houseNumber`/`postcode`/
`city`, `src/lib/geocode/geocodeAddress.ts`) statt eines fertigen String-Feldes — das Formular
hat dafür eigene Felder für Straße, Hausnummer, PLZ und Ort statt eines einzelnen
Freitextfeldes (`Tatort-Adresse`), damit die Bußgeldstelle die Angaben eindeutig zuordnen kann.
`src/lib/geocode/formatAddress.ts` fügt die vier Felder dort wieder zu einer Zeile zusammen, wo
nur Anzeige-/Fließtext gebraucht wird (E-Mail-Text, lokale Historie). `houseNumber` ist bewusst
optional (Formular wie Provider) — nicht jeder Verstoßort lässt sich einer exakten Hausnummer
zuordnen.

LocationIQs kostenloser Tarif sieht laut Nutzungsbedingungen einen sichtbaren Attributions-Link
in der UI vor — umgesetzt als dezenter Link im global eingebundenen `Footer.svelte` (neben
Datenschutz-Link und Versionsnummer, erscheint dadurch auf jeder Route).

Zusätzlich zum Reverse-Geocoding gibt es einen **Autocomplete**-Proxy
(`src/routes/api/geocode/autocomplete/+server.ts`, `src/lib/geocode/autocomplete.ts`) für die
Adressvorschlagsliste während des Tippens ("Deine Angaben" und Tatort) — nutzt denselben
`LOCATIONIQ_API_KEY`, aber ohne Fallback-Kette (BigDataCloud hat kein Autocomplete-Äquivalent;
bei Fehler einfach leere Liste, kein Nutzer-blockierendes Ereignis). Anders als der bestehende
Reverse-Geocode-Proxy (der pro Formular nur einmal blockierend wartet) drosselt der
Autocomplete-Proxy **non-blocking**: Bei potenziell einem Call pro Tastendruck würde
blockierendes Warten Anfragen stauen und alte Antworten zeitversetzt gegen neuere Queries laufen
lassen. Beide Endpunkte teilen sich stattdessen ein gemeinsames Soft-Limit-Modul
(`src/lib/geocode/rateLimiter.ts`), da LocationIQs 2-Req/Sekunde-Limit prozessweit für beide
gilt; Client-seitiges Debounce (~300ms) ist der wichtigste Hebel gegen Request-Flut.

Die Autocomplete-Suche ist zusätzlich per LocationIQ-`viewbox` + `bounded=1` hart auf eine
Köln-Bounding-Box begrenzt (`KOELN_VIEWBOX` in `src/lib/geocode/autocomplete.ts`) — die App
deckt aktuell nur Köln ab (s. u., "Weitere Stadt hinzufügen"), striktes statt weiches Bounding
vermeidet irrelevante Vorschläge aus anderen Städten. Wird eine zweite Stadt ergänzt, muss die
Bounding-Box parametrisiert werden (z. B. pro `city.id`), statt weiter hart codiert zu sein.

`parseExif` (`src/lib/exif/parseExif.ts`) nutzt **`exifreader`**, nicht `exifr`: `exifr` hat
einen fest einprogrammierten Größen-Sanity-Check für die `ftyp`-Box von HEIC-Dateien, den neuere
iPhones (mehr "compatible brands" wegen HDR-Gain-Map, siehe Abschnitt zu HEIC unten)
überschreiten — `exifr.parse` liefert dann kommentarlos ein leeres Ergebnis zurück (kein Fehler,
kein Wurf), wodurch Datum/Uhrzeit/Adresse im Formular unbefüllt bleiben. `exifreader` ist davon
nicht betroffen und wird aktiv gegen aktuelle Apple-Dateiformate getestet. API-mäßig arbeitet
`parseExif` mit dem `expanded: true`-Output (`tags.gps.Latitude`/`Longitude`,
`tags.exif.DateTimeOriginal.description`) statt Rohbytes zu parsen.

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

`workbox.manifestTransforms` filtert Dateien ≥ 512 KB aus dem Precache-Manifest heraus (siehe
nächster Abschnitt zu HEIC) — SvelteKit hasht Chunk-Dateinamen ohne lesbaren Namensanteil,
daher ist eine Größen- statt Glob-Filterung nötig. `workbox.maximumFileSizeToCacheInBytes` ist
auf 6 MB angehoben, da Workbox' Standardlimit (2 MiB) bereits vor `manifestTransforms` greift
und sonst den Build hart abbricht, sobald der `heic-to`-Chunk (mehrere MB durch die gebündelte
`libheif`-WASM) den `globPatterns`-Scan durchläuft — die Datei bleibt trotzdem außerhalb des
tatsächlichen Precache.

### Branding-Assets über `@vite-pwa/assets-generator` statt eigenem Skript

Icons/Favicons wurden ursprünglich über ein eigenes Skript (`scripts/generate-icons.mjs`)
erzeugt; das ist entfallen. Stattdessen generiert `@vite-pwa/assets-generator` über die
`pwaAssets`-Option von `SvelteKitPWA` (`vite.config.ts`) alle benötigten Icon-Größen und
Favicons zur Build-Zeit aus einer einzigen SVG-Quelle (`static/app-icon.svg`) — eine Quelle
statt mehrerer manuell gepflegter PNG-Exporte, keine separat aufzurufende Skript-Pflicht mehr.
`static/app-icon.svg` muss direkt in `static/` liegen (SvelteKits Pendant zu Vites
`publicDir`), nicht in einem Unterordner, da die generierten Dateinamen (`pwa-*.png`,
`favicon.ico`, …) root-relativ ins Manifest geschrieben werden.

Es kommt ein eigenes `preset` statt des `minimal-2023`-Defaults zum Einsatz: Das Icon ist
bereits ein randloses, quadratisches Vollbild-Motiv mit eigenem Innenabstand, das
Standard-Padding (30 % + weißer Hintergrund für maskable/apple) würde es zusätzlich verkleinern
und einen sichtbaren weißen Rand einfügen.

Die Logo-/Wortmarken-Komponenten (`src/lib/components/branding/BrandIcon.svelte`,
`LogoLockup.svelte`, `Wordmark.svelte`) nutzen die bestehende Primary-Farbe der App statt eines
eigenen Markenrots — ein eigenes Markenrot wurde testweise eingeführt und wieder verworfen, um
konsistent mit der bestehenden `oklch()`-Token-Konvention (s. u., Coding-Konventionen) zu
bleiben.

### HEIC/HEIF-Fotos werden client-seitig zu JPEG konvertiert

iPhones speichern Fotos standardmäßig als HEIC; `createImageBitmap` (für Vorschau/Kompression)
wird dafür nicht von allen Browsern unterstützt (Chrome/Firefox auf Desktop typischerweise
nicht). `src/lib/image/convertHeic.ts` erkennt HEIC/HEIF anhand MIME-Type oder Dateiendung
(`isHeicFile`) und konvertiert bei Bedarf per `heic-to` zu JPEG, bevor `compressImage`
darauf zugreift. EXIF (Datum/GPS) wird bewusst **vor** der Konvertierung aus der Original-Datei
gelesen (`parseExif`), da die Konvertierung Metadaten verwirft. `heic-to` (Nachfolger von
`heic2any`, das an neueren iPhone-HEIC-Dateien mit Apples HDR-Gain-Map mit
`heif_error_Invalid_input` scheiterte, da die von `heic2any` gebündelte `libheif`-WASM-Version
seit Jahren nicht aktualisiert wurde; `heic-to` zieht aktuelle `libheif`-Releases nach) wird
per dynamic `import()` nur bei tatsächlicher HEIC-Auswahl geladen und ist deshalb vom
Service-Worker-Precache ausgeschlossen (s. o.), um die App-Shell klein zu halten.

Da sowohl die HEIC-Konvertierung als auch die anschließende Canvas-Kompression
(`compressImage`) das Bild neu encodieren und dabei jedes EXIF-Segment verwerfen, wird das per
`parseExif` gelesene Datum/GPS über `src/lib/image/embedExif.ts` (`piexifjs`) nach der
Kompression wieder in die finale JPEG-Datei eingebettet — nicht nur für HEIC-Importe, sondern
für jedes Foto, da `compressImage` unabhängig vom Ursprungsformat immer durchlaufen wird. So
lässt sich Datum/Ort auch direkt aus dem versendeten Beweisfoto prüfen, nicht nur aus dem
E-Mail-Text. Schlägt das Einbetten fehl, wird das unveränderte komprimierte Foto verschickt
(fail-open) — die Angaben stehen ohnehin im E-Mail-Text.

### Mehrere Verstoßarten pro Anzeige

`incidentTypeIds` ist ein Array (Checkbox-Mehrfachauswahl statt Dropdown). Jede Verstoßart in
`src/lib/config/cities.ts` hat neben `label` (UI, kurze Liste) eine `description` (vollständiger
Satz für die E-Mail). `buildEmailBody` kombiniert bei mehreren gewählten Verstoßarten die
Labels zu einer Aufzählung ("Art des Verstoßes: X, Y") und die Beschreibungen zu einer
Stichpunktliste im Fließtext — so bleibt der Text auch bei mehreren gleichzeitig vorliegenden
Verstößen (z. B. Gehweg + Kreuzungsbereich) klar strukturiert.

### Hausnummer bei der eigenen Adresse: Pflicht, mit Straße zusammengelegt

Die eigene Adresse des Anzeigenden ("Deine Angaben") muss laut Bußgeldstelle immer
vollständig/zustellbar sein — anders als beim Tatort (dort bleibt die Hausnummer bewusst
optional und ein separates Feld, s. o.: nicht jeder Verstoßort lässt sich einer exakten
Hausnummer zuordnen). Statt eines eigenen Pflichtfelds wird die Hausnummer Teil des
Straße-Freitextfelds (`addressStreet`, z. B. "Musterstraße 12") und per Regex
(`HOUSE_NUMBER_SUFFIX_PATTERN` in `src/lib/validation/formSchema.ts`: endet auf eine Zahl,
optional gefolgt von einem Buchstaben) statt eines vollständigen Adress-Parsers validiert — für
die reine "ist eine Hausnummer angegeben"-Prüfung reicht das, ein echter Parser wäre
Overengineering für diesen einen Anwendungsfall.

### Vorgaben aus dem Original-Meldeformular der Stadt Köln (FAQ-Kandidaten)

Beim Abgleich mit dem Original-Formular der Bußgeldstelle Köln sind mehrere Vorgaben
aufgefallen, die nicht offensichtlich aus dem Code hervorgehen. Als Rohtext für eine spätere
eigene FAQ-Seite festgehalten — **Stand 11.09.2026, kann sich ändern, vor Produktivbetrieb
erneut mit der Stadt Köln abgleichen**:

- **Telefonnummer (optional):** Das Original-Formular bittet um eine Telefonnummer "für den
  Fall, dass wir kurzfristig Rückfragen haben ..., unter der Sie tagsüber zu erreichen sind."
  Mobil oder Festnetz, keine Formatvorgabe — daher `phone?: string` ohne Regex-Validierung (s.
  Coding-Konventionen, keine Validierung ohne echten Bedarf). Wird in `buildEmailBody.ts` an den
  Schlusssatz angehängt, wenn vorhanden.
- **4-Minuten-Regel bei Parkverstößen:** "Der Tattag und die Tatzeit sind genau zu benennen. Für
  die Ahndung von Parkverstößen ist zwingend eine Mindestparkzeit von vier Minuten
  erforderlich. Halteverstöße können selbstverständlich nach wie vor mit Zeiten unter vier
  Minuten angegeben werden." Umgesetzt als explizite Nutzer-Auswahl "Halteverstoß" (Default,
  Einzelzeitpunkt) vs. "Parkverstoß" (Zeitraum von–bis, hart auf ≥ 4 Minuten validiert) in
  `VehicleBlock.svelte`/`validateVehicle` (`src/lib/validation/formSchema.ts`) — eine explizite
  Auswahl statt eine automatische Ableitung aus der Verstoßart, da die App sonst eine
  zusätzliche Halte-/Park-Klassifizierung pro `incidentTypeId` bräuchte.
- **Kennzeichen-Format:** "Aus verarbeitungstechnischen Gründen benötigen wir das Autokennzeichen
  in folgendem Format: H-VA1234. Dabei muss sich zwischen dem Kürzel für den
  Kennzeichenbezirk und der Buchstabenkombination ein Bindestrich befinden, zwischen Buchstaben-
  und Ziffernkombination darf kein weiteres Zeichen, auch kein Leerzeichen stehen." Die Eingabe
  bleibt tippfreundlich/flexibel; `normalizeLicensePlate()` (`src/lib/validation/formSchema.ts`)
  formt sie erst beim Versand/in der Historie ins kanonische Format um — kein
  Formatzwang beim Tippen selbst.
- **Marke und Farbe:** "Bitte geben Sie die Farbe an. Hilfsweise gehen auch Beschreibungen wie
  hell, dunkel et cetera." Beide Angaben sind Pflichtfelder (`VehicleEntry.make`/`.color`);
  Marke hat "Unbekannt" als vorausgewählten Default (`<datalist>`-Vorschlagsliste in
  `src/lib/config/vehicleMakes.ts`, Freitext bleibt trotzdem möglich), Farbe ist reiner
  Freitext ohne Formatvorgabe.
- **Fahrzeugart:** Das Original-Formular erwartet eine geschlossene Auswahl statt Freitext.
  Umgesetzt als feste Liste (`VEHICLE_TYPES` in `src/lib/config/vehicleTypes.ts`: PKW, LKW, LKW
  mit Anhänger, Motorrad, Bus, Anhänger ohne Zugfahrzeug, Sonstiges) — anders als bei Marke
  bewusst kein Freitext/keine `<datalist>`, da hier keine offene Auswahl erwartet wird.
- **Länderkennzeichen:** Pflichtfeld, Default `"D"` (weit überwiegender Regelfall bei in Köln
  gemeldeten Verstößen, bleibt aber editierbar für ausländische Kennzeichen).

### Demo/Live-Modus-Auswahl pro Session, manuell über das Header-Badge wechselbar

Solange die App nicht vollständig getestet ist, würde ein versehentlicher Live-Versand eine
echte Ordnungswidrigkeits-Anzeige an die Stadt Köln auslösen. Deshalb fragt ein blockierender
Dialog (`src/lib/components/AppModeDialog.svelte`, global über `src/routes/+layout.svelte`
eingebunden), ob im **Demo-Modus** (Anzeige geht an eine interne Test-Adresse) oder im
**Live-Modus** (Anzeige geht tatsächlich an die Bußgeldstelle Köln) gearbeitet werden soll —
weder Backdrop-Klick noch Escape schließen ihn, nur die beiden Buttons. Die Wahl wird in
`sessionStorage` gespeichert (`STORAGE_KEY` in `src/lib/appMode.svelte.ts`) und gilt dadurch
**pro Tab/Session**: Ein Reload behält die zuletzt getroffene Wahl, ein neuer Tab/eine neue
Session erzwingt die Entscheidung erneut. Bewusst kein `localStorage`, damit die Wahl nicht
dauerhaft über Sessions hinweg bestehen bleibt — anfangs wurde hier auf jeden Reload erneut
gefragt (reiner In-Memory-Modul-State, kein Persistieren), das erwies sich im täglichen
Gebrauch aber als zu aufdringlich.

Ein Klick auf das Modus-Badge im Header (`PageHeader.svelte`, jetzt ein `<button>` statt eines
reinen `<span>`) ruft `appMode.requestChange()` auf und öffnet den Dialog jederzeit erneut, um
den Modus manuell zu wechseln — der zuvor in `sessionStorage` gespeicherte Wert wird dabei erst
mit der nächsten expliziten Auswahl überschrieben, nicht schon beim Öffnen des Dialogs.

Der gewählte Modus liegt als Client-Runen-Modul in `src/lib/appMode.svelte.ts` (`AppMode =
'demo' | 'live'`) und wird an zwei Stellen konsumiert: `PageHeader.svelte` zeigt ihn dauerhaft
als klickbares Badge neben dem Logo/Titel an (Live auffällig in Fehlerfarbe, da real
konsequenzenbehaftet), `ReportForm.svelte` leitet daraus die angezeigte
E-Mail-Vorschau-Adresse ab und schickt den Modus beim Absenden als `mode`-Feld im FormData an
`/api/send`. Der Server (`src/routes/api/send/+server.ts`) validiert `mode` gegen `'live'` und
fällt bei jedem anderen/fehlenden Wert **sicher auf `'demo'`** zurück — ein manipulierter oder
vergessener Client-Wert darf nie zu einem ungewollten Live-Versand führen.

Empfänger-seitig gibt es dafür zwei getrennte Env-Vars statt der bisherigen einen
(`RECIPIENT_EMAIL` → `RECIPIENT_EMAIL_DEMO`/`RECIPIENT_EMAIL_LIVE`,
`src/lib/config/cities.server.ts`, `getRecipientEmail(cityId, mode)`) — bewusst über Env-Vars
statt hartcodiert im Code, damit sich die Zieladresse der Stadt Köln ohne Deploy ändern lässt
und alle Empfänger-Adressen an einer Stelle konfigurierbar bleiben. Die offizielle Adresse der
Bußgeldstelle Köln für Fremdanzeigen ist laut
["Falsch geparktes Fahrzeug melden – Stadt Köln"](https://www.stadt-koeln.de/service/produkte/00449/index.html)
**`bussgeldstelle@stadt-koeln.de`** (Stand 2026-09-13, vor Produktivbetrieb erneut
gegenprüfen, s. auch FAQ-Rohtext-Abschnitt oben).

### Versionsnummer: einzige Quelle der Wahrheit ist `package.json`

Die in der App angezeigte Versionsnummer (site-weiter Footer, `src/lib/components/
Footer.svelte`) wird nicht hartcodiert, sondern zur Build-Zeit aus `package.json`s
`version`-Feld injiziert — per `define: { __APP_VERSION__: ... }` in `vite.config.ts`, global
typisiert in `src/app.d.ts`. So gibt es nur eine Stelle, an der die Version gepflegt wird; ein
manuelles Nachziehen der UI-Anzeige entfällt.

**Die Patch-Version wird bei jedem Commit automatisch hochgezählt** — ein Husky-Pre-Commit-Hook
(`.husky/pre-commit`) führt `npm version patch --no-git-tag-version --allow-same-version` aus
und staged `package.json`/`package-lock.json`, bevor der Commit abgeschlossen wird. Der Bump
landet dadurch atomar im selben Commit, kein separater Versions-Commit, kein `--amend` nötig.
Für Minor-/Major-Sprünge (Breaking Changes, größere Features) den Patch-Bump danach manuell per
`npm version minor|major --no-git-tag-version` korrigieren.

## Ordnerstruktur

| Pfad                                             | Zweck                                                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`                        | Formular-Seite (bindet `ReportForm.svelte` ein)                                                                                                                 |
| `src/routes/historie/+page.svelte`               | Liste bereits versendeter Anzeigen aus IndexedDB                                                                                                                |
| `src/routes/api/send/+server.ts`                 | Serverseitiger E-Mail-Versand über Brevo                                                                                                                        |
| `src/routes/api/geocode/+server.ts`              | Reverse-Geocoding-Proxy (LocationIQ + BigDataCloud-Fallback, Throttling)                                                                                        |
| `src/routes/api/geocode/autocomplete/+server.ts` | Adress-Autocomplete-Proxy (LocationIQ, non-blocking Throttling)                                                                                                 |
| `src/lib/components/`                            | Svelte-Komponenten (`ReportForm.svelte`, `VehicleBlock.svelte`, `AddressAutocomplete.svelte`, `Footer.svelte`, `IosInstallBanner.svelte`) — dünn, primär Markup |
| `src/lib/components/branding/`                   | Logo-/Wortmarken-Komponenten (`BrandIcon.svelte`, `LogoLockup.svelte`, `Wordmark.svelte`), s. ADR "Branding-Assets" oben                                        |
| `src/lib/config/cities.ts`                       | Client-sicherer Städte-Katalog (`incidentTypes`, `buildEmailBody`), **kein** Env-Import                                                                         |
| `src/lib/config/cities.server.ts`                | Serverseitige, modusabhängige Empfänger-Zuordnung (`$env/static/private`), getrennt von `cities.ts`                                                             |
| `src/lib/appMode.svelte.ts`                      | Client-Runen-Modul für die Demo-/Live-Modus-Wahl, s. ADR "Demo/Live-Modus-Auswahl" oben                                                                         |
| `src/lib/components/AppModeDialog.svelte`        | Blockierender Demo-/Live-Auswahldialog, global in `+layout.svelte` eingebunden                                                                                  |
| `src/lib/config/vehicleMakes.ts`                 | Kuratierte Marken-Liste für die Marke-`<datalist>` (Fahrzeugbeschreibung), Freitext bleibt möglich                                                              |
| `src/lib/config/vehicleTypes.ts`                 | Feste Fahrzeugart-Liste (`VEHICLE_TYPES`), geschlossene Auswahl statt Freitext                                                                                  |
| `src/lib/email/buildEmailBody.ts`                | Reine Funktion: Formulardaten → E-Mail-Betreff/-Text                                                                                                            |
| `src/lib/exif/parseExif.ts`                      | Wrapper um `exifreader`, robust gegen fehlende/korrupte EXIF-Tags                                                                                               |
| `src/lib/image/embedExif.ts`                     | Bettet Datum/GPS (`piexifjs`) nach Konvertierung/Kompression zurück ins JPEG                                                                                    |
| `src/lib/geocode/reverseGeocode.ts`              | Providerbasierte Fallback-Logik, unabhängig von SvelteKit testbar                                                                                               |
| `src/lib/geocode/geocodeAddress.ts`              | `GeocodeAddress`-Interface (Straße/Hausnr./PLZ/Ort), von Server und Client geteilt                                                                              |
| `src/lib/geocode/formatAddress.ts`               | Reine Funktion: `GeocodeAddress`-Felder → ein Adress-String (E-Mail-Text, Historie)                                                                             |
| `src/lib/geocode/client.ts`                      | Ruft `/api/geocode` vom Client aus auf                                                                                                                          |
| `src/lib/geocode/autocomplete.ts`                | LocationIQ-Autocomplete-Provider (ohne Fallback-Kette)                                                                                                          |
| `src/lib/geocode/autocompleteClient.ts`          | Ruft `/api/geocode/autocomplete` vom Client aus auf, fail-quiet                                                                                                 |
| `src/lib/geocode/httpErrors.ts`                  | Gemeinsame HTTP-Fehlertext-Logik für Reverse-Geocode und Autocomplete                                                                                           |
| `src/lib/geocode/rateLimiter.ts`                 | Gemeinsames Throttle-Modul (blocking + non-blocking) für beide Geocode-Proxys                                                                                   |
| `src/lib/history/db.ts`                          | `idb`-Wrapper für die lokale Historie                                                                                                                           |
| `src/lib/profile/profileStore.svelte.ts`         | `localStorage`-Wrapper mit Svelte-5-Runes                                                                                                                       |
| `src/lib/image/compress.ts`                      | Canvas-basierte Bildkompression                                                                                                                                 |
| `src/lib/pwa/isIosSafari.ts`                     | Reine, testbare UA-Erkennung für den iOS-Install-Hinweis                                                                                                        |
| `src/lib/validation/formSchema.ts`               | Handgeschriebene Formular-Validierung                                                                                                                           |
| `src/routes/datenschutz/+page.svelte`            | Datenschutzerklärung, aus `Footer.svelte` verlinkt                                                                                                              |
| `static/app-icon.svg`                            | Icon-Quelle für `@vite-pwa/assets-generator`, s. ADR "Branding-Assets" oben                                                                                     |
| `e2e/`                                           | Playwright-Tests + `fixtures/photo-with-gps.jpg` (EXIF-Testbild)                                                                                                |
| `scripts/`                                       | Einmalige Setup-Skripte (EXIF-Fixture-Generierung) — nicht Teil der App                                                                                         |

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
- Farben ausschließlich als `oklch()` — kein `#hex`, `rgb()`/`rgba()`, `hsl()`/`hsla()` oder
  benannte CSS-Farben (`white`, `red`, …) mehr. Neue Design-Tokens gehören in den
  `@theme`-Block in `src/routes/layout.css`; Komponenten referenzieren ausschließlich diese
  Tokens über Tailwind-Utility-Klassen, nie rohe Farbwerte im Markup.

## Weitere Stadt hinzufügen (hypothetisch, aktuell nicht umgesetzt)

Aktuell ist ausschließlich Köln aktiv, aber die Struktur blockiert eine spätere Erweiterung
nicht:

1. In `src/lib/config/cities.ts` einen zweiten Eintrag im `CITIES`-Record ergänzen (`id`,
   `label`, `incidentTypes`, `buildEmailBody`).
2. In `src/lib/config/cities.server.ts` die zugehörigen Empfänger-E-Mails in
   `DEMO_RECIPIENT_EMAILS`/`LIVE_RECIPIENT_EMAILS` ergänzen (je eine eigene ENV-Variable, da
   `$env/static/private` nur serverseitig importierbar ist).
3. Keine UI zur Stadtauswahl bauen, solange nicht explizit gefordert — das ist bewusst
   außerhalb des aktuellen Scopes (YAGNI).

## Umgebungsvariablen

| Variable               | Zweck                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `BREVO_API_KEY`        | API-Key für den E-Mail-Versand über Brevo.                                                                         |
| `EMAIL_FROM`           | Feste Absenderadresse (bei Brevo verifizierter Einzel-Sender oder Domain).                                         |
| `RECIPIENT_EMAIL_DEMO` | Empfänger im Demo-Modus (interne Test-Adresse), s. ADR "Demo/Live-Modus-Auswahl" oben.                             |
| `RECIPIENT_EMAIL_LIVE` | Empfänger im Live-Modus (Bußgeldstelle Köln, `bussgeldstelle@stadt-koeln.de`).                                     |
| `LOCATIONIQ_API_KEY`   | Access-Token für die LocationIQ Reverse-Geocoding-API (primärer Geocoding-Provider), auch für Adress-Autocomplete. |

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
ursprünglich geforderten PWA-Anforderungen werden stattdessen manuell verifiziert: Manifest
unter `/manifest.webmanifest` (Name, Icons 192/512/maskable, `display: standalone`) und
Service-Worker-Generierung beim Build (`@vite-pwa/sveltekit`, siehe Build-Output).
