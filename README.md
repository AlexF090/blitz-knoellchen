# Knöllchen-Blitz

Progressive Web App zur Meldung von Falschparkern an die Bußgeldstelle Köln per E-Mail.
Ziel: eine Anzeige in unter 30 Sekunden vom Smartphone aus verschicken — Foto machen, EXIF
liest Datum/GPS aus, Adresse wird per Reverse-Geocoding ermittelt, Verstoßart auswählen,
absenden.

## Voraussetzungen

- Node.js ≥ 20
- Ein [Resend](https://resend.com)-Account (kostenloses Kontingent reicht für die Testphase)

## Setup

```bash
npm install
cp .env.example .env
```

`.env` mit echten Werten füllen (siehe [Umgebungsvariablen](#umgebungsvariablen)). `.env` ist
in `.gitignore` und darf nie committet werden.

### Resend einrichten

1. Account auf [resend.com](https://resend.com) anlegen, API Key erzeugen → `RESEND_API_KEY`.
2. Für die Testphase kann `EMAIL_FROM=onboarding@resend.dev` (Resend-Sandbox-Adresse) genutzt
   werden. Für den echten Betrieb: eigene Domain in Resend verifizieren und als `EMAIL_FROM`
   eintragen.
3. `RECIPIENT_EMAIL` während der Testphase auf die eigene E-Mail-Adresse setzen, um den
   kompletten Versand zu prüfen, ohne echte Anzeigen zu verschicken. Für den Produktivbetrieb
   auf die tatsächliche Bußgeldstelle-Adresse (z. B. `bussgeldstelle@stadt-koeln.de`) ändern.
4. Hinweis: Resend-Sandbox-Absender können in der Praxis nur an die beim Resend-Account
   verifizierte Adresse senden. Für einen offenen Empfängerkreis wird eine verifizierte eigene
   Domain benötigt.

### Nominatim einrichten

Kein API-Key nötig, aber die
[Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) verlangt
einen aussagekräftigen `User-Agent`-Header:

```
NOMINATIM_USER_AGENT=knoellchen-blitz/1.0 (deine-email@example.com)
```

Schlägt Nominatim fehl (Rate-Limit erreicht, Dienst down), fällt der Server automatisch auf
[BigDataCloud](https://www.bigdatacloud.com/) zurück (kostenlos, kein Key nötig).

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
   `.env.example` eintragen (`RESEND_API_KEY`, `EMAIL_FROM`, `RECIPIENT_EMAIL`,
   `NOMINATIM_USER_AGENT`).
3. Deploy auslösen (Push auf den verbundenen Branch reicht).

## Installation auf dem Smartphone

**Android (Chrome):** Beim Öffnen der App erscheint automatisch ein Install-Banner
(„Zum Startbildschirm hinzufügen“). Alternativ über das Chrome-Menü (⋮) → „App installieren“.

**iOS/iPadOS (Safari):** iOS kennt kein automatisches Install-Prompt. Die App zeigt daher einen
dezenten Hinweis-Banner am unteren Bildschirmrand: Tippe auf „Teilen“ (⬆️) → „Zum
Home-Bildschirm“. Die Installation funktioniert **nur in Safari**, nicht in Chrome/Firefox auf
iOS.

## Umgebungsvariablen

| Variable               | Zweck                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`       | API-Key für den E-Mail-Versand über Resend.                                             |
| `EMAIL_FROM`           | Feste Absenderadresse (Resend-Sandbox oder verifizierte Domain).                        |
| `RECIPIENT_EMAIL`      | Empfänger der Anzeige-Mail (Testphase: eigene Adresse; Produktion: Bußgeldstelle Köln). |
| `NOMINATIM_USER_AGENT` | Pflicht-Header für Nominatim-Reverse-Geocoding-Anfragen laut Usage Policy.              |

Details zu Architekturentscheidungen und Codebase-Konventionen: siehe [`CLAUDE.md`](./CLAUDE.md).
