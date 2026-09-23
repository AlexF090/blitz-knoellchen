# Sicherheit

## Schwachstelle melden

Sicherheitsrelevante Funde bitte **nicht** als öffentliches Issue anlegen, sondern über
[GitHub Security Advisories](https://github.com/AlexF090/blitz-knoellchen/security/advisories/new)
melden. Ich melde mich innerhalb weniger Tage zurück. Der Link funktioniert, sobald Private
Vulnerability Reporting aktiviert ist (Settings → Security); bis dahin liefert er einen 404.

Relevant sind insbesondere:

- Wege, über die serverseitige API-Schlüssel (Brevo, LocationIQ) nach außen gelangen können
- Missbrauch der Proxy-Endpunkte `/api/geocode` und `/api/geocode/autocomplete`
- Möglichkeiten, über `/api/send` E-Mails mit fremdem Absender oder an fremde Empfänger zu verschicken
- XSS über Formulareingaben oder Foto-Metadaten

## Was diese App schützt

- **API-Schlüssel bleiben serverseitig.** Brevo und LocationIQ werden ausschließlich aus
  SvelteKit-Server-Endpunkten heraus aufgerufen; der Browser spricht nur eigene `/api/*`-Routen an.
- **Der Hauptempfänger wird nie vom Client bestimmt.** Der Client schickt lediglich `demo` oder `live`;
  die zugehörige Adresse löst der Server aus seiner eigenen Konfiguration auf. Ein fehlender oder
  manipulierter Wert fällt auf `demo` zurück, nie auf den Live-Empfänger. Die Kopie (BCC) und die
  Antwortadresse gehen dagegen an die vom Client angegebene Melder-Adresse, siehe unten.
- **Anhänge werden serverseitig geprüft.** `/api/send` nimmt nur Fotos an, die als `image/jpeg`
  deklariert sind und mit der JPEG-Signatur beginnen.
- **Eingaben werden serverseitig erneut validiert** (`src/lib/validation/formSchema.ts`) — die
  Client-Validierung ist reine Komfortfunktion und keine Vertrauensgrenze.
- **Content-Security-Policy** ohne `unsafe-inline` für Skripte, dazu `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
  und eine `Permissions-Policy` ohne Kamera, Mikrofon, Standort und Payment (`vite.config.ts`,
  `src/lib/server/applySecurityHeaders.ts`).
- **Keine Server-Persistenz.** Anzeigenhistorie und Entwürfe liegen ausschließlich lokal im
  Browser (IndexedDB); es gibt keine Datenbank mit Nutzerdaten.

## Bekannte Einschränkungen

- Das Rate-Limiting der Geocoding-Proxys (`src/lib/geocode/rateLimiter.ts`) hält den Modul-State
  pro Server-Prozess. In einer Serverless-Umgebung mit mehreren parallelen Instanzen schützt es
  daher das eigene LocationIQ-Kontingent nur näherungsweise und ist kein Missbrauchsschutz.
- `/api/send` drosselt auf 20 Anfragen pro Stunde und IP, hat aber kein CAPTCHA. Das Limit liegt
  wie beim Geocoding im Speicher und gilt nur pro Serverless-Instanz. Weil die BCC-Kopie an die
  vom Client angegebene Adresse geht, lassen sich darüber weiterhin E-Mails von der
  Absender-Domain an beliebige Adressen auslösen, nur langsamer.
- `require-trusted-types-for: 'script'` ist bewusst nicht aktiv — der Chunk-Loader von
  SvelteKit weist `script.src` dynamisch zu, was die Hydration blockieren würde. Begründung im
  CSP-Block in `vite.config.ts`.
- `npm audit` meldet vier Befunde der Stufe _low_, alle aus derselben Quelle:
  [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) in `cookie@0.6.0`,
  das `@sveltejs/kit` mit der Range `^0.6.0` mitbringt (`npm ls cookie`). Die Lücke betrifft nur
  `serialize()` mit Cookie-Name, -Pfad oder -Domain aus Nutzereingaben. Diese App setzt keine
  Cookies, der Pfad ist nicht erreichbar. Bewusst kein `overrides`-Eintrag auf `cookie@0.7`: Er
  würde die von SvelteKit deklarierte Range verletzen, für eine Lücke ohne Angriffsfläche. Erledigt
  sich mit einem SvelteKit-Release auf `cookie` ≥ 0.7.
