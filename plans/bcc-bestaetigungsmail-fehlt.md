# Bestätigungs-Mail (bcc) an den Melder kommt nicht an

## Context

Beim Versand einer Anzeige wird laut `CLAUDE.md`/ADR die vom Nutzer eingegebene E-Mail-Adresse
als `replyTo` **und** `bcc` an Brevo übergeben (`src/routes/api/send/+server.ts:100-108`), damit
der Melder eine Kopie der versendeten Anzeige als Bestätigung erhält. Im aktuellen Test kam die
Mail nur beim `to`-Empfänger (Bußgeldstelle/Testadresse) an, nicht per `bcc` beim Melder — und
die Melder-Adresse war nachweislich eine andere als `RECIPIENT_EMAIL` (Dedupe durch gleiche
Adresse ist also als Ursache ausgeschlossen).

Der Code selbst (`bcc: [{ email: data.email }]`) folgt der korrekten Brevo-API-Syntax für
`v3/smtp/email`. Der Handler prüft aktuell aber nur `response.ok` und loggt weder die
Brevo-Response (insbesondere `messageId`) noch etwaige Fehler — dadurch lässt sich aus dem Code
allein nicht feststellen, ob Brevo den bcc-Empfänger akzeptiert, aber nicht zugestellt
(Bounce/Block/Spam) oder die Anfrage selbst schon ohne bcc verarbeitet hat. Ziel dieses Plans:
zunächst die tatsächliche Ursache über die Brevo-Zustell-Logs verifizieren, danach gezielt
fixen statt zu raten.

## Schritt 1 — Ursache über Brevo-Logs verifizieren (vor jeder Code-Änderung)

Brevo protokolliert jeden Sende- und Zustellversuch pro Empfänger im Transactional-Log. Dort
sehen wir schwarz auf weiß, ob der bcc-Empfänger überhaupt einen Zustellversuch bekommen hat
und mit welchem Status (`delivered`, `blocked`, `softBounce`, `hardBounce`, `invalid`, `spam`, …).

- Per `curl` gegen `GET https://api.brevo.com/v3/smtp/statistics/events?email=<melder-email>&limit=20`
  (Header `api-key: $BREVO_API_KEY` aus `.env`) die Events für die Melder-Adresse der zuletzt
  versendeten Anzeige abrufen.
- Alternativ/ergänzend: Brevo-Dashboard → Transactional → Logs, dort den konkreten Versand
  suchen (nach Zeitstempel/Betreff) und die einzelnen Empfänger-Zeilen (to vs. bcc) inspizieren.
- Prüfen: Ist der bcc-Empfänger dort überhaupt als Empfänger gelistet? Wenn ja mit welchem
  Status? Wenn nein: Anfrage kam nie mit bcc bei Brevo an (eher Code-/Request-Problem, aber der
  aktuelle Code sieht korrekt aus, also unwahrscheinlich).
- Nutzer zusätzlich bitten, den Spam-/Werbeordner der Melder-Adresse zu prüfen — "blocked wegen
  Spam-Filter beim Empfänger" ist der häufigste Grund für "bcc kommt nicht an, to schon", vor
  allem wenn Melder-Domain (z.B. Gmail/Web.de) strenger filtert als die Testadresse.

## Schritt 2 — Observability nachrüsten (unabhängig vom Ergebnis aus Schritt 1 sinnvoll)

In `src/routes/api/send/+server.ts` aktuell kein Logging der Brevo-Response. Ergänzen:

- Bei `response.ok`: `messageId` aus der Response (`{ messageId: string }`) mit `console.log`
  (oder vorhandenem Logging-Mechanismus, falls vorhanden — in der Codebase gibt es aktuell
  keinen zentralen Logger, daher `console.log`/`console.error` als bisherige Konvention) loggen,
  damit sich künftige "kam nicht an"-Fälle über die `messageId` direkt in den Brevo-Logs
  nachschlagen lassen.
- Bei `!response.ok`: den Response-Body (`await response.text()` oder `.json()`) mitloggen statt
  ihn zu verwerfen — aktuell wird bei Fehlschlag nur ein generisches `502` zurückgegeben, ohne
  dass der eigentliche Brevo-Fehlergrund irgendwo sichtbar wird.

## Schritt 3 — Gezielter Fix, abhängig vom Befund aus Schritt 1

Nicht vorab implementieren, sondern nach Sichtung der Logs entscheiden:

- **Fall "blocked/bounced beim Melder"**: kein Code-Bug, sondern Zustellproblem beim
  Empfänger-Mailserver — ggf. Hinweis in der UI ergänzen ("Bestätigung kann im Spam-Ordner
  landen") statt Code-Fix am Versand selbst.
- **Fall "bcc-Empfänger taucht in Brevo-Logs gar nicht auf"**: dann tatsächlich ein
  Request-/API-Problem (z.B. Brevo-Tarif/Account unterstützt `bcc` in diesem Plan nicht, oder
  ein Feld wird falsch serialisiert) — dann `bcc` probeweise durch einen zweiten, separaten
  `fetch`-Call an Brevo ersetzen (eigene Mail an `data.email` statt gemeinsamer bcc), da das
  robuster ist und in den Logs als eigenständiger Zustellversuch klar sichtbar wird.
- **Fall "delivered laut Brevo, aber Nutzer hat nichts bekommen"**: reines
  Zustellungs-/Postfach-Problem außerhalb unserer Kontrolle, kein Fix nötig, nur Kommunikation
  an den Nutzer.

## Verifikation

- Nach Schritt 2: `npm run test:unit` (falls Tests für `+server.ts` existieren, ggf. Mock der
  Brevo-Response um Logging-Pfad zu decken) und `npm run lint`.
- Nach Schritt 3 (falls Code geändert wurde): eine Test-Anzeige mit zwei unterschiedlichen,
  echten Adressen (Melder ≠ Testempfänger) versenden und in beiden Postfächern (inkl.
  Spam-Ordner) prüfen, ob beide Mails ankommen. Zusätzlich Brevo-Log für diesen Versand
  gegenchecken.
