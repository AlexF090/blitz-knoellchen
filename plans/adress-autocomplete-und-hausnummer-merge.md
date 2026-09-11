# Adress-Autocomplete + Pflicht-Hausnummer bei "Deine Angaben"

## Kontext

Beim Ausfüllen des Formulars soll die Adresseingabe schneller und tippfehlerfreier werden:
Sowohl bei "Deine Angaben" als auch beim "Tatort" soll während des Tippens eine
Adressvorschlagsliste erscheinen (LocationIQ Autocomplete, gleicher `LOCATIONIQ_API_KEY`
wie beim bestehenden Reverse-Geocoding). Manuelle Eingabe muss weiterhin vollständig
funktionieren — Autocomplete ist reine Komfort-Ergänzung, kein Zwang.

Zusätzlich soll bei "Deine Angaben" die Hausnummer zur Pflichtangabe werden (die eigene
Adresse des Anzeigenden muss laut Bußgeldstelle immer vollständig/zustellbar sein). Das
separate, optionale Hausnr.-Feld entfällt dort und wird Teil des Straße-Freitextfelds
(z. B. "Musterstraße 12"), validiert per Regex ("endet auf eine Zahl, optional gefolgt von
einem Buchstaben"). Der Tatort behält bewusst sein separates, optionales Hausnr.-Feld
(bestehende ADR-Begründung: nicht jeder Verstoßort lässt sich einer exakten Hausnummer
zuordnen).

## Teil 1 — Autocomplete-Backend

**Neu: `src/lib/geocode/autocomplete.ts`**
Analog zu `reverseGeocode.ts`, aber ohne Fallback-Kette (BigDataCloud hat kein
Autocomplete-Äquivalent — bei Fehler einfach leere Liste):

```ts
export interface AddressSuggestion {
  label: string; // display_name für die Dropdown-Zeile
  street: string | null;
  houseNumber: string | null;
  postcode: string | null;
  city: string | null;
}
export const createLocationIqAutocompleteProvider = (apiKey: string, fetchFn: typeof fetch) => { ... }
```

- Endpoint (verifiziert via LocationIQ-Doku): `https://api.locationiq.com/v1/autocomplete?key=...&q=...&format=json&accept-language=de&countrycodes=de&limit=5&normalizecity=1`.
- Response-`address`-Objekt hat dieselbe Form wie beim Reverse-Call (`road`, `house_number`,
  `postcode`, `city`) — Mapping-Logik kann eng an `createLocationIqProvider` angelehnt werden.
- Gleiches `AbortSignal.timeout(REQUEST_TIMEOUT_MS)`-Pattern; `describeHttpError`
  (429/403-Sonderfälle) aus `reverseGeocode.ts` extrahieren in eine gemeinsame Datei
  `src/lib/geocode/httpErrors.ts` und aus beiden Modulen importieren, statt zu duplizieren.
- Query < 3 Zeichen → sofort `[]` ohne Request.

**Neu: `src/routes/api/geocode/autocomplete/+server.ts`**
Eigener Sub-Endpoint unter dem bestehenden `/api/geocode`-Pfad (analog zu dessen
Reverse-Geocode-Handler, aber separat wegen anderer Rate-Limit-Charakteristik):

```ts
export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 3) return json({ suggestions: [] });
	if (isThrottled()) return json({ suggestions: [] }); // non-blocking, siehe unten
	try {
		const suggestions = await createLocationIqAutocompleteProvider(
			LOCATIONIQ_API_KEY,
			fetch
		).search(q);
		return json({ suggestions });
	} catch (error) {
		console.error('[autocomplete] fehlgeschlagen:', error);
		return json({ suggestions: [] });
	}
};
```

Wichtig: liefert bei Fehlern **200 mit leerem Array**, nicht 502 — ein Autocomplete-Fehler
ist kein Nutzer-blockierendes Ereignis (Nutzer tippt einfach weiter).

**Rate-Limiting — bewusst anders als beim bestehenden Reverse-Proxy:**
Der bestehende `/api/geocode`-Handler blockiert per `await sleep()`, das ist für einen
einmaligen Call pro Report unmerklich. Bei Autocomplete (potenziell 1 Call pro
Tastendruck) würde blockierendes Warten Anfragen stauen und alte Antworten zeitversetzt
gegen neuere Queries laufen lassen. Stattdessen:

- Client-seitiges Debounce (~300ms) in der neuen Komponente — der wichtigste Hebel.
- Serverseitig ein **non-blocking** Soft-Limit: gemeinsames Throttle-Modul
  `src/lib/geocode/rateLimiter.ts` (`shouldThrottle(minIntervalMs)`, Modul-State wie
  bisher), das von `/api/geocode` (weiterhin blockierend) und
  `/api/geocode/autocomplete` (bei Überschreitung sofort leere Liste zurückgeben statt zu
  warten) gemeinsam genutzt wird — wichtig, weil LocationIQs 2-Req/s-Limit für beide
  Endpunkte gemeinsam gilt.
- Race-Schutz im Client (nicht am Server): pro Tastatureingabe eine hochzählende
  Request-ID; beim Verarbeiten der Antwort wird verworfen, wenn inzwischen eine neuere
  Anfrage gestartet wurde.

**Client: `src/lib/geocode/autocompleteClient.ts`**

```ts
export const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => { ... } // fail-quiet wie fetchAddress
```

**Tests:** `src/lib/geocode/autocomplete.test.ts` (gleiches `vi.fn()`-Provider-Mock-Pattern
wie `reverseGeocode.test.ts`: Erfolg, HTTP-Fehler, leere/kurze Query ohne Fetch-Call).

## Teil 2 — Generische Autocomplete-Komponente

**Neu: `src/lib/components/AddressAutocomplete.svelte`**
Kennt nur "Text rein, Vorschlagsliste, Auswahl-Callback raus" — kein Wissen über
`ReportFormData`, Feld-Namen oder die Hausnummer-Merge-Logik. Feld-Mapping bleibt beim
Aufrufer (`ReportForm.svelte`).

Props (Svelte 5 Runes, `value` als `$bindable`):

```ts
interface Props {
	id: string;
	value: string; // $bindable
	label: string;
	required?: boolean;
	autocompleteAttr?: string;
	placeholder?: string;
	error?: string;
	onSelect: (s: AddressSuggestion) => void;
	onBlur?: () => void;
}
```

Verhalten: Debounce 300ms ab 3 Zeichen → `fetchAddressSuggestions`; Race-Schutz per
Request-Token; Tastatur (`ArrowDown`/`ArrowUp`/`Enter`/`Escape`); Klick-außerhalb schließt
Dropdown; volles ARIA-Combobox-Pattern (`role="combobox"`, `aria-expanded`,
`aria-activedescendant`, Listbox `role="listbox"`/`role="option"`). Styling mit
bestehenden Tokens (`rounded-control`, `border-border`, `bg-surface`, `shadow-card`,
`text-primary-600` für aktive Option) — Dropdown als absolut positioniertes `<ul>` unter
dem Input, damit es sich ins bestehende `grid-cols-[2fr_1fr]`-Layout einfügt.

**Einsatz in `ReportForm.svelte`:**

- "Deine Angaben": ersetzt die beiden bisherigen Inputs durch ein einzelnes
  `<AddressAutocomplete id="addressStreet" label="Straße und Hausnr." required
bind:value={form.addressStreet} onBlur={saveProfileFields} onSelect={...} />`.
  `onSelect` setzt `form.addressStreet = [s.street, s.houseNumber].filter(Boolean).join(' ')`
  und übernimmt `postcode`/`city` als Komfort-Bonus.
- "Tatort": Struktur bleibt (separates Hausnr.-Feld daneben unverändert), nur das
  Straßenfeld wird zu `<AddressAutocomplete id="locationStreet" ... onSelect={...} />`.
  `onSelect` ruft denselben kleinen Mapping-Helper `applyLocationAddress(form, address)`
  auf, der auch aus `onAddPhoto`s EXIF-Zweig (aktuell Zeilen ~117–121) heraus verwendet
  wird — das ist die sinnvolle DRY-Grenze: Datenübernahme (Street/Hausnr./PLZ/Ort →
  `form.location*`) wird geteilt, die EXIF-spezifische Fehlerbehandlung
  (`geocodeError`, GPS-Koordinaten-Notiz) bleibt exklusiv in `onAddPhoto`.

**Neuer e2e-Test:** `e2e/address-autocomplete.e2e.ts` — mockt
`**/api/geocode/autocomplete**`, tippt in `#addressStreet`, prüft Dropdown
(`role="option"`), Auswahl per Klick und per Tastatur (ArrowDown+Enter), prüft
Feldbefüllung für beide Gruppen.

## Teil 3 — Hausnummer-Merge bei "Deine Angaben"

Datei-für-Datei (nur `address*`-Seite betroffen, `location*`-Seite bleibt unverändert):

- **`src/lib/validation/formSchema.ts`**: `ReportFormData.addressHouseNumber?` entfernen.
  Neue Konstante `HOUSE_NUMBER_SUFFIX_PATTERN = /\d+\s?[a-zA-ZäöüÄÖÜ]?$/` neben
  `POSTCODE_PATTERN`. `validateProfileFields`: leer-Check bleibt, zusätzlich Regex-Check
  mit Fehlertext „Bitte Straße mit Hausnummer angeben (z. B. „Musterstraße 12").
- **`src/lib/history/db.ts`**: `UserProfile.addressHouseNumber` entfernen; `getProfile()`
  destrukturiert es nicht mehr. Keine IndexedDB-Versions-Migration nötig — ein evtl. noch
  gespeichertes verwaistes Property wird beim nächsten `saveProfile()` (z. B. `onblur`)
  automatisch durch das neue, kleinere Objekt überschrieben; einziger Nebeneffekt ist ein
  einmaliger Zustand, in dem ein vorausgefülltes Straßenfeld noch ohne Hausnummer
  erscheint, bis einmal neu gespeichert wird — akzeptabel, kein zusätzlicher Migrationscode.
- **`src/lib/profile/profileStore.svelte.ts`**: `addressHouseNumber: ''` aus
  `EMPTY_PROFILE` entfernen.
- **`src/lib/config/cities.ts`**: `EmailTemplateInput.addressHouseNumber?` entfernen
  (`locationHouseNumber?` bleibt).
- **`src/lib/email/buildEmailBody.ts`**: `addressLine`-Aufruf von `formatAddress` ohne
  `houseNumber`-Property (Hausnummer steckt bereits in `input.addressStreet`).
  `locationLine` unverändert.
- **`src/routes/api/send/+server.ts`**: `addressHouseNumber`-Parsing aus `FormData` und
  die entsprechende Property im `buildEmailBody`-Aufruf entfernen. `locationHouseNumber`
  unverändert.
- **`src/lib/components/ReportForm.svelte`**: `addressHouseNumber` aus Form-State,
  `$effect`-Profil-Ladeblock, `saveProfileFields()` und `onSubmit`-FormData entfernen.
  Markup "Deine Angaben": zwei Inputs im `grid-cols-[2fr_1fr]` → ein
  `<AddressAutocomplete>` über volle Breite, Label „Straße und Hausnr.", Placeholder „z. B.
  Musterstraße 12". Markup "Tatort" strukturell unverändert.

## Teil 4 — Tests aktualisieren

Unit: `profileStore.svelte.test.ts`, `db.svelte.test.ts`, `buildEmailBody.test.ts`,
`formSchema.test.ts` — `addressHouseNumber`-Fixtures entfernen, `addressStreet`-Werte um
Hausnummer ergänzen (z. B. `'Musterstraße 1'`); in `formSchema.test.ts` neue Fälle für die
Regex (gültig: „Musterstraße 12", „Musterstraße 12a"; ungültig: „Musterstraße" ohne
Nummer). `locationHouseNumber`-bezogene Tests bleiben unangetastet.

e2e: `happy-path.e2e.ts`, `multi-vehicle.e2e.ts`, `photo-required.e2e.ts`,
`send-failure-preserves-data.e2e.ts` — `#addressHouseNumber`-Fill-Zeilen entfernen,
`#addressStreet` direkt mit vollständigem Wert befüllen (z. B. `'Musterstraße 1'`); in
`send-failure-preserves-data.e2e.ts` die entsprechende Value-Assertion anpassen. Da alle
diese Tests `#addressStreet` per `.fill()` direkt ansprechen (kein Dropdown-Zwang), bleibt
die Suite robust gegenüber Autocomplete-Netzwerk-Latenz.

## Teil 5 — CLAUDE.md

- Bestehenden ADR-Absatz "Reverse Geocoding über einen eigenen Server-Proxy mit
  Fallback-Kette" um 2–3 Sätze zum neuen Autocomplete-Proxy ergänzen (Verweis auf
  `src/routes/api/geocode/autocomplete/+server.ts`, Begründung für
  Non-Blocking-Rate-Limiting statt Blocking-Sleep).
- Neuen ADR-Absatz "Hausnummer bei der eigenen Adresse: Pflicht, mit Straße
  zusammengelegt" ergänzen (Begründung: eigene Adresse muss zustellbar sein, Tatort bleibt
  bewusst anders; Regex-Ansatz statt vollständigem Adress-Parser).
- Env-Var-Tabelle: Beschreibung von `LOCATIONIQ_API_KEY` um „... auch für
  Adress-Autocomplete" ergänzen (kein neuer Eintrag, gleicher Key).

## Reihenfolge

1. Autocomplete-Backend (Teil 1) inkl. Tests — unabhängig von Teil 3, keine Breaking Changes.
2. Hausnummer-Merge (Teil 3) — Typen/Validierung/Backend zuerst, dann Markup.
3. `AddressAutocomplete.svelte` bauen und in beide Formular-Gruppen einhängen (Teil 2) —
   setzt auf 1 und 2 auf.
4. Tests + CLAUDE.md begleitend zu jedem Schritt.

## Verifikation

- `npm run check` (svelte-check) und `npm run lint` nach jedem Teil.
- `npm run test:unit` für die neuen/angepassten Unit-Tests (`autocomplete.test.ts`,
  `formSchema.test.ts`, `buildEmailBody.test.ts`, `profileStore.svelte.test.ts`,
  `db.svelte.test.ts`).
- `npm run test:e2e` für die angepassten und den neuen e2e-Test; dabei insbesondere
  `e2e/address-autocomplete.e2e.ts` manuell im Playwright-UI-Modus verfolgen (Dropdown
  erscheint, Tastatur-Navigation funktioniert, Auswahl befüllt korrekt).
- Manuell im Dev-Server (`npm run dev`) beide Adressgruppen durchspielen: Tippen löst
  Vorschläge aus, Auswahl per Maus und Tastatur, Escape schließt Dropdown, Tab/Klick
  außerhalb schließt Dropdown ohne Auswahl, rein manuelle Eingabe ohne je eine Vorschlagsliste
  zu öffnen funktioniert weiterhin (inkl. Validierungsfehler bei fehlender Hausnummer bei
  "Deine Angaben").
