# Architektur

Vollständige Architekturentscheidungen (ADRs), Ordnerstruktur und Umgebungsvariablen für
Blitz-Knöllchen. Einstieg, Setup und Kommandos: [`../README.md`](../README.md).

## Projektüberblick

**Blitz-Knöllchen** ist eine Progressive Web App, mit der Falschparker der Bußgeldstelle Köln
per E-Mail gemeldet werden können ("Fremdanzeige"). Zielgruppe: Menschen, die spontan im
Alltag ein falsch geparktes Auto sehen und es in rund 30 Sekunden vom Smartphone aus melden
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

Autoresponder antworten an `From`, nicht an `Reply-To`. Die automatische Eingangsbestätigung der
Bußgeldstelle landet deshalb im Postfach von `EMAIL_FROM`, nicht beim Melder; Antworten von
Sachbearbeitern über „Antworten“ gehen an den Melder. Eine Weiterleitung an den Melder würde
Inbound-Parsing und eine Absenderadresse pro Melder brauchen; der Nutzen ist gering, weil die
Auto-Antwort nur einen Standardtext enthält. Das Postfach bewahrt Mails der Bußgeldstelle
6 Monate auf (Verjährung nach § 26 Abs. 3 StVG); FAQ und Datenschutzerklärung (Abschnitte 5 und 11)
nennen diese Frist.

Weil die BCC-Kopie an eine Adresse vom Client geht, ließe sich der Endpunkt sonst als Relay
nutzen. `/api/send` drosselt deshalb auf 10 Anfragen pro Minute und IP und nimmt nur Anhänge an,
die als `image/jpeg` deklariert sind und mit der JPEG-Signatur beginnen. Das Limit zählt das
Cloudflare Rate Limiting Binding (s. ADR „Hosting auf Cloudflare Workers“); ein CAPTCHA bräuchte
einen externen Dienst.

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

### Geocoding über Geoapify, proxied über eigene Server-Endpunkte

**Geoapify** (EU-Endpunkt `api-eu.geoapify.com`, Verarbeitung laut AVV in der EU/im EWR,
hausnummer-genau; kostenloser Tarif: 3.000 Anfragen pro Tag, 5 pro Sekunde) liefert
Reverse-Geocoding und Autocomplete. Die Aufrufe laufen über `src/routes/api/geocode/+server.ts`
und `src/routes/api/geocode/autocomplete/+server.ts`, damit der API-Key nie ins Client-Bundle
gelangt. Geoapify ist der einzige geprüfte Anbieter mit dauerhaft kostenlosem Kontingent, AVV
auch im Free-Tarif und Verarbeitung in der EU. Andere scheiden aus: Nominatim verbietet
Autocomplete und blockt Dauernutzung, OpenCage schließt Free-Nutzer aus der AVV aus, LocationIQ
und BigDataCloud verarbeiten außerhalb der EU ohne Standardvertragsklauseln, und der kostenlose
Endpunkt von BigDataCloud darf laut Fair-Use-Policy nicht vom Server aufgerufen werden.

Es gibt keinen Fallback-Anbieter. Scheitert Geoapify, wird das Adressfeld im Formular
editierbar/Pflicht; ein fehlender GPS-EXIF-Tag ist ein erwarteter Zustand (sofortige manuelle
Eingabe), kein Fehler. `reverseGeocode` (`src/lib/geocode/reverseGeocode.ts`) bleibt
providerbasiert, damit ein weiterer Anbieter ohne Umbau ergänzt werden kann.

`/api/geocode` liefert eine strukturierte `GeocodeAddress` (`street`/`houseNumber`/`postcode`/
`city`, `src/lib/geocode/geocodeAddress.ts`) statt eines fertigen String-Feldes — das Formular
hat dafür eigene Felder für Straße, Hausnummer, PLZ und Ort statt eines einzelnen
Freitextfeldes (`Tatort-Adresse`), damit die Bußgeldstelle die Angaben eindeutig zuordnen kann.
`src/lib/geocode/formatAddress.ts` fügt die vier Felder dort wieder zu einer Zeile zusammen, wo
nur Anzeige-/Fließtext gebraucht wird (E-Mail-Text, lokale Historie). `houseNumber` ist bewusst
optional (Formular wie Provider) — nicht jeder Verstoßort lässt sich einer exakten Hausnummer
zuordnen.

Der kostenlose Tarif von Geoapify verlangt einen sichtbaren Link „Powered by Geoapify“ plus
OSM-Hinweis — umgesetzt im global eingebundenen `Footer.svelte`, dadurch auf jeder Route.

Zusätzlich zum Reverse-Geocoding gibt es einen **Autocomplete**-Proxy
(`src/routes/api/geocode/autocomplete/+server.ts`, `src/lib/geocode/autocomplete.ts`) für die
Adressvorschlagsliste während des Tippens ("Deine Angaben" und Tatort) — nutzt denselben
`GEOAPIFY_API_KEY`; bei Fehler kommt einfach eine leere Liste, kein Nutzer-blockierendes Ereignis. Anders als der bestehende
Reverse-Geocode-Proxy (der pro Formular nur einmal blockierend wartet) drosselt der
Autocomplete-Proxy **non-blocking**: Bei potenziell einem Call pro Tastendruck würde
blockierendes Warten Anfragen stauen und alte Antworten zeitversetzt gegen neuere Queries laufen
lassen. Beide Endpunkte teilen sich stattdessen ein gemeinsames Soft-Limit-Modul
(`src/lib/geocode/rateLimiter.ts`, 250 ms Mindestabstand pro Isolate), da Geoapifys Limit von
5 Anfragen pro Sekunde für beide gilt; Client-seitiges Debounce (~300ms) ist der wichtigste Hebel gegen Request-Flut.

Die Autocomplete-Suche ist zusätzlich per Geoapify-Filter `rect:` hart auf eine
Köln-Bounding-Box begrenzt (`KOELN_RECTANGLE` in `src/lib/geocode/autocomplete.ts`) — die App
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
Adresse, E-Mail) liegt separat im Store `profile` derselben IndexedDB
(`src/lib/profile/profileStore.svelte.ts`), damit es beim nächsten Öffnen sofort vorausgefüllt ist.

### Bildkompression über native Canvas API

Vor dem Versand wird das Foto über `HTMLCanvasElement`/`toBlob` verkleinert
(`src/lib/image/compress.ts`) — bewusst ohne zusätzliche Dependency, da Web-Standard-APIs
ausreichen. Kleine Fotos halten den Brevo-Body klein: Base64 und `JSON.stringify` kosten
CPU-Zeit, und Cloudflare Workers Free erlaubt 10 ms CPU pro Anfrage.

### PWA über `@vite-pwa/sveltekit`

Manifest und Service Worker laufen über das offizielle Vite/SvelteKit-PWA-Modul statt über
handgeschriebene Konfiguration (`vite.config.ts`). Seit Version 2 umhüllt `withPwa(kitOptions,
pwaOptions)` die SvelteKit-Konfiguration und ruft `sveltekit()` selbst auf; die Workbox-Optionen
stehen unter `generateSW`. iOS/Safari kennt kein `beforeinstallprompt` — bei Erkennung
(`src/lib/pwa/isIosSafari.ts`) zeigt `IosInstallBanner.svelte` einen dezenten, dismissable
Hinweis ("Teilen → Zum Home-Bildschirm") statt eines Modals.

Die Strategie ist bewusst simpel gehalten:

- **Registrierung** in `src/hooks.client.ts` (`registerSW` aus `virtual:pwa-register`). Eine
  HTML-Einbindung greift nicht, weil SvelteKit die Seiten selbst rendert. Eine neue Version wird
  im Hintergrund aktiv, die offene Seite lädt aber nicht automatisch neu (`onNeedReload` leer):
  Ein Reload mitten im Ausfüllen kostete Eingaben. Sichtbar wird die neue Version beim nächsten
  Öffnen oder per Pull-to-Refresh (`src/lib/pwa/reloadLatest.ts`).
- **Precache nur für Assets** (JS, CSS, Icons, Manifest). Seiten kommen immer vom Server
  (`navigateFallback: null`): Sie werden serverseitig mit Server-Daten und CSP-Nonce pro Antwort
  gerendert und liegen nie im Precache. Offline lädt die App deshalb nicht; Absenden braucht
  ohnehin Netz.
- **`/api/*` ist `NetworkOnly`** (Geocoding/Send dürfen nie gecacht werden). Die Regel ist eine
  Pfadprüfung statt einer RegExp, weil Workbox eine RegExp gegen die volle URL prüft.
- **Größenlimit 512 KiB** (`maximumFileSizeToCacheInBytes`, `throwMaximumFileSizeToCacheInBytes:
false`): Größere Dateien, vor allem der `heic-to`-Chunk (mehrere MB durch die gebündelte
  `libheif`-WASM), bleiben ohne Build-Abbruch außerhalb des Precache. SvelteKit hasht
  Chunk-Dateinamen ohne lesbaren Namensanteil, daher Größen- statt Glob-Filterung.
- Eigene `globPatterns` brauchen das Präfix `client/`, sonst ergänzt das Plugin ein eigenes
  Muster und jede Datei steht doppelt im Precache. `globStrict: false`, weil das Plugin immer ein
  Muster für vorgerenderte Seiten ergänzt und die App keine hat.

### Hosting auf Cloudflare Workers

Die App läuft als Cloudflare Worker (`@sveltejs/adapter-cloudflare`, Konfiguration in
`wrangler.jsonc`) unter `blitz-knoellchen.appool.de`. Grund ist die Auftragsverarbeitung: Für den
Free-Tarif bindet Cloudflare seinen DPA in das Self-Serve Subscription Agreement ein. Bei Vercel
gilt der DPA nur für Pro und Enterprise.

- **Laufzeit workerd, nicht Node.** Die Node-Version aus `.nvmrc` gilt nur für den Build. Ab
  `compatibility_date` 2026-08-04 ist `nodejs_compat` Standard; der Code nutzt trotzdem
  Web-APIs (`Uint8Array.prototype.toBase64()` statt `Buffer`).
- **Umgebungsvariablen zur Laufzeit.** Keine Variable trägt `static: true`: Secrets stünden sonst
  im Worker-Bundle. Auf Cloudflare kommen sie aus den Variablen und Secrets des Workers, lokal aus
  `.env` oder `.dev.vars`.
- **Rate-Limits über das Rate Limiting Binding** (`ratelimits` in `wrangler.jsonc`,
  `src/lib/server/rateLimiters.ts`): `/api/send` 10, Geocoding 30 Anfragen pro Minute und IP. Das
  Binding kennt nur Fenster von 10 oder 60 Sekunden und zählt pro Standort ungefähr. Ein Zähler
  im Speicher gälte nur pro Isolate. Er dient deshalb nur als Ersatz für E2E-Tests
  (`SEND_LIMIT_PER_MINUTE`) und für Umgebungen ohne Binding.
- **`npm run preview` ist `wrangler dev`.** `vite preview` führt den Server in Node aus und kann
  `cloudflare:workers` nicht laden. Die E2E-Tests laufen deshalb gegen den gebauten Worker in
  workerd.
- **CPU-Limit 10 ms pro Anfrage (Free), bewusst in Kauf genommen.** `/api/send` braucht mit drei
  Fotos in normaler Größe rund 27 ms CPU (gemessen per `wrangler tail`), weil Request-Annahme,
  Base64 und der Upload zu Brevo mit der Bytezahl wachsen. Cloudflare duldet gelegentliche
  Überschreitungen; bricht eine Anfrage doch mit Fehler 1102 ab, zeigt die App einen Fehler und der
  Entwurf bleibt lokal erhalten. Tauchen in den Workers Logs regelmäßig `exceededCpu`-Einträge
  auf, ist Workers Paid (5 USD/Monat, 30 s CPU) der Ausweg, ohne Codeänderung.
- **Indexierung:** Nur `SITE_ORIGIN` ist indexierbar (`applyIndexingPolicy`). `*.workers.dev`,
  Preview-URLs und `localhost` bekommen `X-Robots-Tag: noindex`, ohne eigene Umgebungsvariable.

### Keine Reichweitenmessung

Die App misst keine Seitenaufrufe. Eine Reichweitenmessung wäre ein weiterer Dienstleister in
der Datenschutzerklärung, ohne dass die Zahlen eine Entscheidung tragen. Die automatische
Web-Analytics-Injektion von Cloudflare bleibt für die Zone ausgeschaltet.

### Branding-Assets über `@vite-pwa/assets-generator` statt eigenem Skript

Icons/Favicons wurden ursprünglich über ein eigenes Skript (`scripts/generate-icons.mjs`)
erzeugt; das ist entfallen. Stattdessen generiert `@vite-pwa/assets-generator` über die
`pwaAssets`-Option von `withPwa` (`vite.config.ts`) alle benötigten Icon-Größen und
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

### Link-Vorschau über Open Graph mit versioniertem PNG

Messenger und soziale Netzwerke bauen die Vorschau geteilter Links aus den `og:*`- und
`twitter:*`-Tags in `src/routes/+layout.svelte`. Crawler brauchen absolute URLs. Sie entstehen
aus der festen Origin `SITE_ORIGIN` (`src/lib/site.ts`, `https://blitz-knoellchen.appool.de`)
und dem Pfad (`buildPageMetadata` in `src/lib/seo/pageMetadata.ts`), nicht mehr aus
`page.url.origin`. Begründung: Mit der Origin der Anfrage zeigten `og:url` und `canonical` auf
den jeweiligen Aufrufhost, also auch auf Preview-Deployments und alte Hostnamen;
Suchmaschinen und Messenger sähen mehrere gleichwertige Adressen. Mit fester Origin bleibt die
Produktionsdomain die einzige kanonische Adresse. Dazu kommen ein `<link rel="canonical">`,
JSON-LD (`WebApplication`, `src/lib/seo/structuredData.ts`) und `/sitemap.xml` (vorgerendert,
`src/lib/seo/sitemap.ts`). Der JSON-LD-Block ist ein Datenblock, `script-src` der CSP gilt für
ihn nicht; er braucht weder Nonce noch Hash. `<` wird maskiert, damit kein `</script>` ausbricht.
Das Impressum liegt zentral auf `https://appool.de/impressum` (`/impressum` leitet per 301
dorthin). `og:image` muss ein
Rasterbild sein (SVG zeigen die meisten Messenger nicht), deshalb erzeugt
`npm run og-image` einmalig `static/og-image.png` (1200×630) mit Playwright aus App-Icon,
Wortmarke und Claim. Das PNG ist versioniert und muss nach Änderungen an Icon, Wortmarke oder
Claim neu erzeugt werden. Es ist aus dem Workbox-Precache ausgenommen (`globIgnores`), weil nur
Crawler es abrufen.

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

Zwei Folgen der Content-Security-Policy: `heic-to/csp` startet seinen Worker über eine
`blob:`-URL, deshalb erlaubt `worker-src` neben `'self'` auch `blob:`. Und `embedExif.ts`
dekodiert die data:-URL von `piexifjs` von Hand statt per `fetch`, weil `connect-src` nur
`'self'` zulässt. `e2e/heic-upload.e2e.ts` lädt ein HEIC-Foto gegen den Production-Build hoch und
schlägt bei jedem CSP-Verstoß fehl.

### Mehrere Verstoßarten pro Anzeige

`incidentTypeIds` ist ein Array (Checkbox-Mehrfachauswahl statt Dropdown). Jede Verstoßart in
`src/lib/config/cities.ts` hat neben `label` (UI, kurze Liste) eine `description` (vollständiger
Satz für die E-Mail). `buildEmailBody` kombiniert bei mehreren gewählten Verstoßarten die
Labels zu einer Aufzählung ("Art des Verstoßes: X, Y") und die Beschreibungen zu einer
Stichpunktliste im Fließtext — so bleibt der Text auch bei mehreren gleichzeitig vorliegenden
Verstößen (z. B. Gehweg + Kreuzungsbereich) klar strukturiert.

`emailLabel` und `description` dürfen die Platzhalter `{verb}` und `{noun}` enthalten.
`applyTimeModeWording` (`src/lib/email/timeModeWording.ts`) ersetzt sie je nach gewählter
Zeitangabe: Halteverstoß → „hielt“/„Halten“, Parkverstoß → „parkte“/„Parken“. So bleibt der
E-Mail-Satz zur Auswahl „Halteverstoß“ bzw. „Parkverstoß“ stimmig.

Die Platzhalter tragen alle Verstoßarten, bei denen schon das Halten verboten ist (Gehweg,
Halteverbot, zweite Reihe, Feuerwehrzufahrt, Radweg, entgegen der Fahrtrichtung, Fußgängerüberweg); ihr Formular-Label lautet „Halten/Parken
…“. Parkverbot, Schwerbehinderten-Parkplatz und Kreuzungsbereich verbieten nur das Parken und
bleiben beim festen „parkte“. Sie tragen in der Konfiguration `parkingOnly: true`;
`validateVehicle` lehnt sie zusammen mit „Halteverstoß“ ab (Fehler am Zeitmodus, auch
serverseitig mit 400), weil kurzes Halten dort erlaubt ist und die Anzeige sonst keine Grundlage
hätte. Die Freitexte „Weitere Angaben“ und „Weitere Angaben zu gefährdeten Personen“ sind auf
2000 Zeichen begrenzt (`MAX_FREE_TEXT_LENGTH`).

Zwei weitere, optionale Abschnitte ergänzen die E-Mail. „Ausmaß der Behinderung“ ist eine
Stichpunktliste vollständiger Sätze, „Gefährdete Personen“ ein Satz („Durch das Fahrzeug wurden
insbesondere X, Y und Z gefährdet bzw. behindert.“) mit optionaler Freitextnotiz. Die Auswahl
kommt aus `src/lib/config/impactOptions.ts` (`IMPAIRMENT_OPTIONS`, `ENDANGERED_PERSON_OPTIONS`,
je `label` für die Checkbox und `emailText` für die E-Mail); `joinGermanList` verbindet die
Aufzählung mit „und“. Ohne Auswahl entfällt der Abschnitt vollständig.

Alle drei Checkbox-Gruppen (Verstöße, Ausmaß der Behinderung, gefährdete Personen) zeigen vor
jedem Label ein Icon, damit sich die langen Listen schneller überfliegen lassen. Die Zuordnung
id → Icon liegt getrennt von den Auswahllisten in `src/lib/config/incidentTypeIcons.ts` und
`src/lib/config/impactOptionIcons.ts`, weil `cities.ts` und `impactOptions.ts` auch serverseitig im
E-Mail-Pfad laufen und dort keine Svelte-Komponenten brauchen. Ein `OptionIcon`
(`src/lib/config/optionIcon.ts`) ist ein amtliches Verkehrszeichen (SVG unter `static/signs`,
lokal gehostet), ein Emoji oder ein Lucide-Icon, in dieser Rangfolge: Verkehrszeichen dort, wo ein
einzelnes Schild den Ort des Verstoßes eindeutig zeigt (Zeichen 237, 239, 283, 286, 350), sonst ein
Emoji, und Lucide nur, wo es kein passendes Emoji gibt (Kreuzungsbereich). Alle Icons stehen in einer
Spalte fester Breite, damit die Labels bündig bleiben. Die Icons
sind `aria-hidden`; der zugängliche Name der Checkbox bleibt der Label-Text.

### Entwurf: sofort speichern beim Verlassen, Fortsetzen-Banner, eigener Foto-Store

**Kontext.** Wer mitten im Ausfüllen den Tab wechselt oder die PWA schließt, soll nichts verlieren.
Ein Entwurf mit vielen Fotos ist groß, und ein still wiederhergestellter Entwurf überrascht, wenn
er Tage alt ist oder aus einem früheren Vorgang stammt.

**Entscheidung.**

- `createDraftAutosave` (`src/lib/history/draftAutosave.ts`) entprellt das Speichern (800 ms),
  führt Schreibvorgänge nacheinander aus und kann den vorgemerkten Stand sofort schreiben
  (`flush`). `ReportForm.svelte` ruft `flush` bei `pagehide` und bei `visibilitychange` auf
  `hidden` auf und beim Verlassen der Seite (z. B. Wechsel zur Historie).
- Der Entwurf speichert neben Fahrzeugen und Fotos den Ansichtszustand (zugeklappte Karten,
  Scrollposition, Adress-Hinweise). Die Fotos liegen in einem eigenen Store `draftPhotos`; ein
  Speichern schreibt nur die Metadaten neu und legt die Blobs unbekannter Fotos an
  (`src/lib/history/db.ts`, Schema und Validierung in `src/lib/history/draftSchema.ts`).
- Beim Öffnen wird ein vorhandener Entwurf nicht still wiederhergestellt: `DraftResumeBanner.svelte`
  fragt „Fortsetzen oder Verwerfen“. Bis zur Entscheidung ist der Autosave ausgeschaltet, und
  Absenden und Zurücksetzen sind gesperrt, damit nichts den gespeicherten Entwurf überschreibt
  oder löscht. „Verwerfen“ löscht Fotos und fragt deshalb über `ConfirmDialog` nach.
- Aufbewahrung höchstens sieben Tage (`DRAFT_MAX_AGE_MS`): Ein nie abgesendeter Entwurf soll nicht
  unbegrenzt als Datenschutz-Altlast in der IndexedDB liegen.

**Konsequenzen.**

- `pagehide` ist nur Best-Effort: Chromium bricht IndexedDB-Schreibvorgänge beim Beenden des
  Renderers ab (in Playwright selbst ein reiner `put` aus `pagehide`). `visibilitychange` auf
  `hidden` läuft, solange die Seite noch lebt, und ist vor allem auf iOS verlässlicher. Der
  Debounce bleibt die Grundabsicherung; im ungünstigsten Fall gehen die letzten Änderungen
  seit dem letzten Debounce-Schreibvorgang verloren. `e2e/draft-persistence.e2e.ts` prüft deshalb
  den `visibilitychange`-Pfad, nicht das Schließen des Tabs.
- Zwei Tabs teilen sich einen Entwurfsschlüssel: Der zuletzt schreibende Tab gewinnt.
- Der Hinweis kostet einen Klick bei jedem Öffnen mit Entwurf; dafür gibt es keine
  unerwartet wiederhergestellten Altstände.

### Fotos: Pool ohne Obergrenze, höchstens drei pro Fahrzeug

Der Foto-Pool nimmt beliebig viele Fotos auf (`processPhotoQueue.ts` verarbeitet sie nacheinander
mit Fortschrittsanzeige, ein gescheitertes Foto bricht die übrigen nicht ab). Pro Fahrzeug gelten
höchstens drei Fotos (`MAX_PHOTOS_PER_VEHICLE` in `formSchema.ts`): Jedes Fahrzeug geht als
eigener POST an `/api/send`. Die Grenze schont das CPU-Budget des Workers (10 ms pro Anfrage
im Free-Tarif), Brevos Anhangsgrenze und Mobilnetze. Die Fotos werden vorher komprimiert. Das erste Foto legt automatisch ein
Fahrzeug an, weitere Fotos kommen so lange in dieses Fahrzeug, wie es nur eines gibt und Platz hat
(`autoAssign.ts`); alle übrigen Fotos bleiben im Pool und werden dort als „nicht zugeordnet“ bzw.
„voll“ gekennzeichnet. Nicht zugeordnete Fotos werden nicht mitgesendet.

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
  Coding-Konventionen, keine Validierung ohne echten Bedarf). Steht in `buildEmailBody.ts` unter
  „Angaben zu mir" als eigene Zeile nach Anschrift und E-Mail-Adresse, wenn vorhanden. Die
  E-Mail-Adresse ist Pflichtfeld und steht immer im Text: Der `Reply-To`-Header allein geht
  verloren, sobald die Anzeige ausgedruckt oder in ein Fachverfahren übernommen wird.
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

### Live-Modus als Standard, Demo-Modus pro Session über das Header-Badge

Die App startet ohne Rückfrage im **Live-Modus** (Anzeige geht an die Bußgeldstelle Köln). Wer
einen geteilten Link öffnet, soll direkt melden können, ohne erst einen Dialog wegzuklicken. Ein
Klick auf das Modus-Badge im Header (`PageHeader.svelte`) ruft `appMode.requestChange()` auf und
öffnet den Auswahldialog (`src/lib/components/AppModeDialog.svelte`, global über
`src/routes/+layout.svelte` eingebunden). Dort lässt sich in den **Demo-Modus** wechseln
(Anzeige geht nur an eine interne Test-Adresse, zum gefahrlosen Ausprobieren). Escape und
Backdrop-Klick schließen den Dialog, ohne den Modus zu ändern.

Ein Wechsel wird in `sessionStorage` gespeichert (`STORAGE_KEY` in `src/lib/appMode.svelte.ts`)
und gilt **pro Tab/Session**: Ein Reload behält die Wahl, ein neuer Tab startet wieder live.
Bewusst kein `localStorage`: Wer vor Wochen einmal Demo ausprobiert hat, soll nicht unbemerkt
ins Leere melden. Beim SSR ist der Modus immer `live`; ein gespeicherter Demo-Modus greift erst
nach dem Mount, das Badge wechselt dann kurz nach dem Laden. Bis dahin ist das Badge `disabled`
(`appMode.isRestored`), weil ein Klick vor der Hydration wirkungslos bliebe.

„Absenden“ versendet ohne weitere Bestätigung: Wer eine Anzeige ausfüllt und abschickt, tut das
bewusst. Den Live-Modus zeigt das Badge in Fehlerfarbe an.

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

Die Version wird manuell per `npm version patch|minor|major --no-git-tag-version` gepflegt.
Zuvor zählte ein Husky-Pre-Commit-Hook die Patch-Version bei jedem Commit automatisch hoch; das
erzeugte eine Versionsnummer, die die Anzahl der Commits statt den Auslieferungsstand abbildete,
und ließ jeden Commit `package.json` berühren. Der Hook führt jetzt nur noch `lint-staged` aus.

## Ordnerstruktur

| Pfad                                                 | Zweck                                                                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`                            | Formular-Seite (bindet `ReportForm.svelte` ein)                                                                                                                 |
| `src/routes/historie/+page.svelte`                   | Liste bereits versendeter Anzeigen aus IndexedDB                                                                                                                |
| `src/routes/api/send/+server.ts`                     | Serverseitiger E-Mail-Versand über Brevo                                                                                                                        |
| `src/routes/api/geocode/+server.ts`                  | Reverse-Geocoding-Proxy (Geoapify, Throttling)                                                                                                                  |
| `src/routes/api/geocode/autocomplete/+server.ts`     | Adress-Autocomplete-Proxy (Geoapify, non-blocking Throttling)                                                                                                   |
| `src/lib/components/`                                | Svelte-Komponenten (`ReportForm.svelte`, `VehicleBlock.svelte`, `AddressAutocomplete.svelte`, `Footer.svelte`, `IosInstallBanner.svelte`) — dünn, primär Markup |
| `src/lib/components/ProfileCard.svelte`              | Melderprofil („Deine Angaben“) mit Lese- und Bearbeitungsmodus                                                                                                  |
| `src/lib/components/IncidentLocationFieldset.svelte` | Tatort-Block einer Fahrzeug-Karte: Art der Zeitangabe, Zeitpunkt/Zeitraum, Adresse                                                                              |
| `src/lib/components/VehicleDetailsFieldset.svelte`   | Fahrzeugangaben einer Fahrzeug-Karte: Kennzeichen, Fahrzeugart, Marke, Farbe                                                                                    |
| `src/lib/components/VehiclePreviewDialog.svelte`     | Vorschau der E-Mail zu einem Fahrzeug vor dem Absenden                                                                                                          |
| `src/lib/report/submitVehicleReports.ts`             | Reine Funktion: Versand-Schleife über alle Fahrzeuge plus Historie, Seiteneffekte injiziert                                                                     |
| `src/lib/server/fixedWindowRateLimiter.ts`           | Rate-Limit pro Schlüssel (IP) im Speicher, drosselt `/api/send`                                                                                                 |
| `src/lib/server/applySecurityHeaders.ts`             | Sicherheits-Header für jede Response, aufgerufen aus `src/hooks.server.ts`                                                                                      |
| `src/lib/image/hasJpegSignature.ts`                  | Prüft die JPEG-Signatur der Anhänge in `/api/send`                                                                                                              |
| `src/lib/components/branding/`                       | Logo-/Wortmarken-Komponenten (`BrandIcon.svelte`, `LogoLockup.svelte`, `Wordmark.svelte`), s. ADR "Branding-Assets" oben                                        |
| `src/lib/config/cities.ts`                           | Client-sicherer Städte-Katalog (`incidentTypes`, `buildEmailBody`), **kein** Env-Import                                                                         |
| `src/lib/config/cities.server.ts`                    | Serverseitige, modusabhängige Empfänger-Zuordnung (`$app/env/private`), getrennt von `cities.ts`                                                                |
| `src/lib/appMode.svelte.ts`                          | Client-Runen-Modul für die Demo-/Live-Modus-Wahl, s. ADR "Live-Modus als Standard" oben                                                                         |
| `src/lib/components/AppModeDialog.svelte`            | Live-/Demo-Auswahldialog, öffnet sich über das Header-Badge, global in `+layout.svelte`                                                                         |
| `src/lib/config/vehicleMakes.ts`                     | Kuratierte Marken-Liste für die Marke-`<datalist>` (Fahrzeugbeschreibung), Freitext bleibt möglich                                                              |
| `src/lib/config/vehicleTypes.ts`                     | Feste Fahrzeugart-Liste (`VEHICLE_TYPES`), geschlossene Auswahl statt Freitext                                                                                  |
| `src/lib/email/buildEmailBody.ts`                    | Reine Funktion: Formulardaten → E-Mail-Betreff/-Text                                                                                                            |
| `src/lib/exif/parseExif.ts`                          | Wrapper um `exifreader`, robust gegen fehlende/korrupte EXIF-Tags                                                                                               |
| `src/lib/image/embedExif.ts`                         | Bettet Datum/GPS (`piexifjs`) nach Konvertierung/Kompression zurück ins JPEG                                                                                    |
| `src/lib/geocode/reverseGeocode.ts`                  | Geoapify-Provider und providerbasierte Abfrage, unabhängig von SvelteKit testbar                                                                                |
| `src/lib/geocode/geocodeAddress.ts`                  | `GeocodeAddress`-Interface (Straße/Hausnr./PLZ/Ort), von Server und Client geteilt                                                                              |
| `src/lib/geocode/formatAddress.ts`                   | Reine Funktion: `GeocodeAddress`-Felder → ein Adress-String (E-Mail-Text, Historie)                                                                             |
| `src/lib/geocode/client.ts`                          | Ruft `/api/geocode` vom Client aus auf                                                                                                                          |
| `src/lib/geocode/autocomplete.ts`                    | Geoapify-Autocomplete-Provider                                                                                                                                  |
| `src/lib/geocode/autocompleteClient.ts`              | Ruft `/api/geocode/autocomplete` vom Client aus auf, fail-quiet                                                                                                 |
| `src/lib/geocode/httpErrors.ts`                      | Gemeinsame HTTP-Fehlertext-Logik für Reverse-Geocode und Autocomplete                                                                                           |
| `src/lib/geocode/rateLimiter.ts`                     | Gemeinsames Throttle-Modul (blocking + non-blocking) für beide Geocode-Proxys                                                                                   |
| `src/lib/history/db.ts`                              | `idb`-Wrapper für Historie, Profil und Entwurf (Stores `entries`, `profile`, `draft`, `draftPhotos`)                                                            |
| `src/lib/components/DraftResumeBanner.svelte`        | Hinweis „Entwurf fortsetzen?“ beim Öffnen, s. ADR „Entwurf“ oben                                                                                                |
| `src/lib/components/CheckboxGroupFieldset.svelte`    | Mehrfachauswahl als Checkbox-Gruppe (Ausmaß der Behinderung, gefährdete Personen)                                                                               |
| `src/lib/config/impactOptions.ts`                    | Auswahllisten für „Ausmaß der Behinderung“ und „Gefährdete Personen“ samt E-Mail-Formulierung                                                                   |
| `src/lib/config/impactOptionIcons.ts`                | Icons für „Ausmaß der Behinderung“ und „Gefährdete Personen“                                                                                                    |
| `src/lib/config/incidentTypeIcons.ts`                | Icons der Verstoßarten (Verkehrszeichen, Emoji, Lucide)                                                                                                         |
| `src/lib/config/optionIcon.ts`                       | Typ `OptionIcon`: Verkehrszeichen, Emoji oder Lucide-Icon                                                                                                       |
| `src/lib/components/OptionIcon.svelte`               | Dekoratives Icon vor einer Checkbox-Option                                                                                                                      |
| `src/lib/email/timeModeWording.ts`                   | Ersetzt `{verb}`/`{noun}` in Verstoßbeschreibungen je nach Halte- oder Parkverstoß                                                                              |
| `src/lib/format/joinGermanList.ts`                   | Verbindet Aufzählungen mit Komma und „und“                                                                                                                      |
| `src/lib/format/germanDate.ts`                       | Datums- und Zeitformatierung (`formatIsoDateDMY`, `formatTimeRange`, `formatTimestampDE`)                                                                       |
| `src/lib/validation/toggleId.ts`                     | Setzt oder entfernt eine id in einer Mehrfachauswahl                                                                                                            |
| `src/lib/photo/processPhotoQueue.ts`                 | Verarbeitet ausgewählte Fotos nacheinander mit Fortschritt, sammelt gescheiterte                                                                                |
| `src/lib/photo/autoAssign.ts`                        | Entscheidet, ob ein neues Foto ein Fahrzeug anlegt, dem ersten zugeordnet wird oder im Pool bleibt                                                              |
| `src/lib/photo/blobSrc.ts`                           | Svelte-Attachment: `blob:`-URL für ein Bild, wird beim Entfernen freigegeben                                                                                    |
| `src/lib/history/draftSchema.ts`                     | Validierung und Zusammenführung des gespeicherten Entwurfs (Metadaten + Foto-Blobs, Höchstalter)                                                                |
| `src/lib/history/draftAutosave.ts`                   | Entprelltes Speichern des Entwurfs mit sofortigem `flush`, Schreibvorgänge nacheinander                                                                         |
| `src/lib/profile/profileStore.svelte.ts`             | Runen-Store für das Melderprofil, persistiert in der IndexedDB (Store `profile`)                                                                                |
| `src/lib/image/compress.ts`                          | Canvas-basierte Bildkompression                                                                                                                                 |
| `src/lib/pwa/isIosSafari.ts`                         | Reine, testbare UA-Erkennung für den iOS-Install-Hinweis                                                                                                        |
| `src/lib/validation/formSchema.ts`                   | Handgeschriebene Formular-Validierung                                                                                                                           |
| `src/routes/datenschutz/+page.svelte`                | Datenschutzerklärung, aus `Footer.svelte` verlinkt                                                                                                              |
| `src/routes/sitemap.xml/+server.ts`                  | Vorgerenderte Sitemap der öffentlichen Seiten (`src/lib/seo/sitemap.ts`)                                                                                        |
| `src/routes/impressum/+server.ts`                    | 301-Weiterleitung auf `https://appool.de/impressum`                                                                                                             |
| `src/lib/site.ts`                                    | Feste Origin `SITE_ORIGIN`, Impressum-URL, Betreiberdaten für die Datenschutzerklärung                                                                          |
| `static/app-icon.svg`                                | Icon-Quelle für `@vite-pwa/assets-generator`, s. ADR "Branding-Assets" oben                                                                                     |
| `e2e/`                                               | Playwright-Tests + `fixtures/photo-with-gps.jpg` bzw. `.heic` (EXIF-Testbilder)                                                                                 |
| `scripts/generate-e2e-fixture.mjs`                   | Einmaliges Setup-Skript für das EXIF-Testbild — nicht Teil der App                                                                                              |
| `scripts/generate-screenshots.mjs`                   | Erzeugt die README-Screenshots aus dem Production-Build (`npm run screenshots`)                                                                                 |
| `scripts/generate-og-image.mjs`                      | Erzeugt das Link-Vorschaubild `static/og-image.png` (`npm run og-image`), s. ADR "Link-Vorschau" oben                                                           |

## Kommandos

```bash
npm run dev        # Dev-Server
npm run build      # Production-Build
npm run preview    # Production-Build lokal ansehen
npm run check      # svelte-check (Typprüfung)
npm run lint       # Prettier --check + ESLint
npm run format     # Prettier --write
npm run test:unit  # Vitest (Unit- + Komponententests, Node- und Browser-Projekt)
npm run test:e2e   # Playwright (installiert Browser, baut + startet die App)
npm run test       # test:unit + test:e2e
npm run screenshots # README-Screenshots aus dem Production-Build
npm run og-image    # Link-Vorschaubild static/og-image.png neu erzeugen
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
- **Kommentare in zwei klar getrennten Rollen.** Ein JSDoc-Block (`/** … */`) über einer Funktion,
  Konstante, Komponente oder Prop beschreibt in ein bis zwei Sätzen, **was** sie tut — VS Code
  zeigt das beim Hover und in der Autocomplete an. Ein Inline-Kommentar (`//`) steht direkt an der
  betroffenen Zeile und erklärt das **Warum**: Workarounds, Browser-Eigenheiten, Svelte-Runes-
  Besonderheiten, bewusste Abweichungen. Keine Typ-Tags (`@param {string}`, `@returns {boolean}`) —
  die Typen liefert TypeScript bereits, redundante Tags veralten still. `@param` nur, wenn es
  Semantik ergänzt, die der Parametername nicht hergibt. Kommentare, die den Code lediglich
  paraphrasieren, gehören nicht in die Codebase. Kommentare beschreiben den aktuellen Stand, keine
  Vorgeschichte („früher …“, „nicht mehr …“) — die gehört in die Commit-Message.
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
   `DEMO_RECIPIENT_EMAILS`/`LIVE_RECIPIENT_EMAILS` ergänzen (je eine eigene ENV-Variable in
   `src/env.ts`, da `$app/env/private` nur serverseitig importierbar ist).
3. Keine UI zur Stadtauswahl bauen, solange nicht explizit gefordert — das ist bewusst
   außerhalb des aktuellen Scopes (YAGNI).

## Umgebungsvariablen

| Variable                | Zweck                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`         | API-Key für den E-Mail-Versand über Brevo.                                                                           |
| `EMAIL_FROM`            | Feste Absenderadresse (bei Brevo verifizierter Einzel-Sender oder Domain). Produktion: `blitz-knoellchen@appool.de`. |
| `RECIPIENT_EMAIL_DEMO`  | Empfänger im Demo-Modus (interne Test-Adresse), s. ADR "Live-Modus als Standard" oben.                               |
| `RECIPIENT_EMAIL_LIVE`  | Empfänger im Live-Modus (Bußgeldstelle Köln, `bussgeldstelle@stadt-koeln.de`).                                       |
| `GEOAPIFY_API_KEY`      | API-Key für Geoapify (Reverse-Geocoding und Adress-Autocomplete).                                                    |
| `BREVO_API_URL`         | Optional, nur für E2E-Tests: leitet den Versand auf den lokalen Brevo-Mock um. Gehört nicht nach Cloudflare.         |
| `SEND_LIMIT_PER_MINUTE` | Optional, nur für E2E-Tests: ersetzt das Rate-Limit-Binding von `/api/send` durch einen Zähler im Speicher.          |

Alle Variablen sind in `src/env.ts` per `defineEnvVars` deklariert und werden zur Laufzeit
gelesen. In Produktion stehen sie als Secrets am Worker (`wrangler secret put`), lokal in `.env`
oder `.dev.vars`. `BREVO_API_URL` und `SEND_LIMIT_PER_MINUTE` werden geprüft (ungültige Werte
brechen den Start ab, statt still auf den Standard zurückzufallen). Ohne `schema` muss eine Variable gesetzt sein,
darf aber leer sein.

Immer über `.env.example` dokumentieren, echte Werte nie committen. Serverseitige Secrets
ausschließlich über `$app/env/private` einbinden (siehe `cities.server.ts`,
`api/send/+server.ts`, `api/geocode/+server.ts`), niemals mit `public: true` deklarieren.

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
- **Env-Trennung:** `$app/env/private` (nur Server, nie im Bundle) vs. `$app/env/public`
  (auch Client, nur für Variablen mit `public: true` in `src/env.ts`) — strikter als Next.js'
  `NEXT_PUBLIC_`-Konvention; ein versehentlicher Client-Import von `$app/env/private` schlägt
  beim Build fehl statt still Secrets zu leaken (Grund für die Trennung
  `cities.ts`/`cities.server.ts`).

## Bekannte Tooling-Einschränkung

Lighthouse ≥ v12 hat die eigenständige PWA-Kategorie entfernt (kein Score mehr dafür). Die
ursprünglich geforderten PWA-Anforderungen werden stattdessen manuell verifiziert: Manifest
unter `/manifest.webmanifest` (Name, Icons 192/512/maskable, `display: standalone`) und
Service-Worker-Generierung beim Build (`@vite-pwa/sveltekit`, siehe Build-Output).
