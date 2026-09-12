# Blitz-Knöllchen

Progressive Web App zur Meldung von Falschparkern an die Bußgeldstelle Köln per E-Mail.
Ziel: eine Anzeige in unter 30 Sekunden vom Smartphone aus verschicken — Foto machen, EXIF
liest Datum/GPS aus, Adresse wird per Reverse-Geocoding ermittelt, Verstoßart auswählen,
absenden.

## Was die App macht

**Blitz-Knöllchen** richtet sich an Menschen, die spontan im Alltag ein falsch geparktes Auto
sehen und es melden wollen, ohne eine native Mail-App zu öffnen oder die Details manuell
zusammenzusuchen. Ablauf in der App:

1. **Foto aufnehmen oder auswählen.** Aus dem Foto werden automatisch Aufnahmedatum und
   GPS-Position aus den EXIF-Metadaten ausgelesen (auch bei iPhone-HEIC-Fotos, die dafür
   client-seitig zu JPEG konvertiert werden).
2. **Adresse per Reverse-Geocoding.** Aus den GPS-Koordinaten ermittelt die App automatisch
   Straße, Hausnummer, PLZ und Ort des Tatorts (mit Adress-Autocomplete beim manuellen
   Nachbessern). Ist kein GPS-Tag vorhanden oder schlägt das Geocoding fehl, wird das
   Adressfeld editierbar und muss manuell ausgefüllt werden.
3. **Verstoß erfassen.** Auswahl einer oder mehrerer Verstoßarten (z. B. Gehweg, Kreuzungsbereich),
   Unterscheidung Halte-/Parkverstoß (inkl. Mindestparkzeit-Regel), Kennzeichen, Marke und
   Farbe des Fahrzeugs sowie die eigenen Kontaktdaten (Name, Adresse, E-Mail, optional Telefon).
4. **Absenden.** Die App verschickt eine fertig formulierte E-Mail an die Bußgeldstelle Köln
   (Versand serverseitig über Brevo) inklusive komprimiertem Foto, in das Datum/GPS wieder
   eingebettet werden. Der Melder erhält automatisch eine Kopie ins eigene Postfach.
5. **Historie.** Bereits versendete Anzeigen werden lokal auf dem Gerät (IndexedDB) gespeichert
   und lassen sich in der App nachschlagen — inkl. komprimiertem Foto-Thumbnail.

Die App ist als installierbare PWA gebaut (Android: automatisches Install-Banner; iOS: Hinweis
zu „Zum Home-Bildschirm“ über Safaris Teilen-Menü) und funktioniert dadurch wie eine native App
auf dem Homescreen. Details zu Architekturentscheidungen (Brevo, Geocoding-Fallback-Kette,
HEIC-Handling etc.) stehen in [`CLAUDE.md`](./CLAUDE.md), der ursprüngliche Auftrag mit allen
Anforderungen in [`PROMPT.md`](./PROMPT.md).

## Voraussetzungen

- Node.js ≥ 20
- Ein [Brevo](https://brevo.com)-Account (kostenloses Kontingent reicht für die Testphase)

## Setup

```bash
npm install
cp .env.example .env
```

`.env` mit echten Werten füllen (siehe [Umgebungsvariablen](#umgebungsvariablen)). `.env` ist
in `.gitignore` und darf nie committet werden.

### Brevo einrichten

1. Account auf [brevo.com](https://brevo.com) anlegen, API Key erzeugen (Settings → SMTP & API
   → API Keys) → `BREVO_API_KEY`.
2. `EMAIL_FROM` muss eine Adresse einer selbst besessenen Domain sein, die in Brevo unter
   „Senders & IPs → Domains“ per SPF-/DKIM-DNS-Records authentifiziert wurde — anders als bei
   manchen anderen Anbietern gibt es keine kostenlose Sandbox-Absenderadresse ohne eigene
   Domain. Eine fremde Adresse (Gmail, GMX, iCloud, …) funktioniert nicht: ohne eigenen
   DNS-Zugriff scheitert die DMARC-Alignment-Prüfung bei strengen Empfängern (siehe ADR
   „E-Mail-Versand über Brevo“ in [`CLAUDE.md`](./CLAUDE.md)).
3. `RECIPIENT_EMAIL` während der Testphase auf die eigene E-Mail-Adresse setzen, um den
   kompletten Versand zu prüfen, ohne echte Anzeigen zu verschicken. Für den Produktivbetrieb
   auf die tatsächliche Bußgeldstelle-Adresse (z. B. `bussgeldstelle@stadt-koeln.de`) ändern.

### LocationIQ einrichten

Account auf [locationiq.com](https://locationiq.com) anlegen, Access Token erzeugen →
`LOCATIONIQ_API_KEY`. Kostenloser Tarif: 5.000 Requests/Tag, 2 Req/Sekunde — der Server
drosselt zusätzlich serverseitig auf 1 Req/Sekunde. Wird für Reverse-Geocoding (Tatort-Adresse
aus Foto-GPS) und Adress-Autocomplete genutzt.

Schlägt LocationIQ fehl (Rate-Limit erreicht, Dienst down), fällt der Server beim
Reverse-Geocoding automatisch auf [BigDataCloud](https://www.bigdatacloud.com/) zurück
(kostenlos, kein Key nötig, liefert aber nur orts-/stadtteilgenaue statt hausnummer-genaue
Adressen). Für Autocomplete gibt es keinen Fallback — bei Fehler bleibt die Vorschlagsliste
einfach leer.

## Lokale Entwicklung

```bash
npm run dev              # Dev-Server
npm run check             # Typprüfung (svelte-check)
npm run lint              # Prettier + ESLint
npm run format             # Prettier --write
npm run test:unit          # Vitest (Unit- + Komponententests)
npm run test:e2e           # Playwright (baut + startet die App automatisch)
npm run test               # test:unit + test:e2e
npm run build               # Production-Build
npm run preview              # Production-Build lokal ansehen
```

## Deployment auf Vercel

Das Projekt nutzt `@sveltejs/adapter-auto`, der auf Vercel automatisch den passenden Adapter
wählt.

1. Repository mit Vercel verbinden (Vercel erkennt SvelteKit automatisch).
2. In den Vercel-Projekteinstellungen unter „Environment Variables“ alle vier Variablen aus
   `.env.example` eintragen (`BREVO_API_KEY`, `EMAIL_FROM`, `RECIPIENT_EMAIL`,
   `LOCATIONIQ_API_KEY`).
3. Deploy auslösen (Push auf den verbundenen Branch reicht).

## Installation auf dem Smartphone

**Android (Chrome):** Beim Öffnen der App erscheint automatisch ein Install-Banner
(„Zum Startbildschirm hinzufügen“). Alternativ über das Chrome-Menü (⋮) → „App installieren“.

**iOS/iPadOS (Safari):** iOS kennt kein automatisches Install-Prompt. Die App zeigt daher einen
dezenten Hinweis-Banner am unteren Bildschirmrand: Tippe auf „Teilen“ (⬆️) → „Zum
Home-Bildschirm“. Die Installation funktioniert **nur in Safari**, nicht in Chrome/Firefox auf
iOS.

## Umgebungsvariablen

| Variable             | Zweck                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`      | API-Key für den E-Mail-Versand über Brevo.                                              |
| `EMAIL_FROM`         | Feste Absenderadresse (in Brevo authentifizierte eigene Domain).                        |
| `RECIPIENT_EMAIL`    | Empfänger der Anzeige-Mail (Testphase: eigene Adresse; Produktion: Bußgeldstelle Köln). |
| `LOCATIONIQ_API_KEY` | Access-Token für die LocationIQ Reverse-Geocoding-/Autocomplete-API.                    |

Details zu Architekturentscheidungen und Codebase-Konventionen: siehe [`CLAUDE.md`](./CLAUDE.md).
