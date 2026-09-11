# TODO

## Manuelle Verifikation: Bestätigungs-Mail (bcc) an den Melder

Root Cause verifiziert und vom Nutzer bestätigt (Proton-Meldung "Domain-Authentifizierungs-
anforderungen nicht bestanden"): Die lokale Test-`.env` hatte `EMAIL_FROM` auf eine private
`@icloud.com`-Adresse gesetzt, die in Brevo nicht domain-authentifiziert (SPF/DKIM) werden
kann. Brevo meldet den SMTP-Versand trotzdem als `delivered`, DMARC-Alignment scheitert aber
beim strikten Empfänger — kein Code-/API-Bug, `bcc` funktioniert wie dokumentiert. Siehe ADR
"E-Mail-Versand über Brevo" in `CLAUDE.md` und Kommentar in `.env.example`. Umgesetzt:

- Logging der Brevo-`messageId` bzw. des Fehler-Response-Bodys in
  `src/routes/api/send/+server.ts`, damit künftige Fälle direkt in den Brevo-Logs nachschlagbar
  sind.
- Hinweis auf den Spam-Ordner in der Erfolgsmeldung (`ReportForm.svelte`) — bleibt als
  generischer Fallback-Hinweis sinnvoll, auch mit korrekt authentifizierter Absender-Domain.
- ADR-Ergänzung in `CLAUDE.md` + Kommentar in `.env.example`, damit `EMAIL_FROM` künftig nicht
  wieder versehentlich auf eine fremde Großanbieter-Domain gesetzt wird.

Automatisiert (Lint, Typecheck, Unit-Tests) bereits grün. Offen bleibt nur:

- [ ] Produktive/echte `.env` prüfen: `EMAIL_FROM` auf eine selbst besessene, in Brevo unter
      Senders & IPs → Domains authentifizierte Domain setzen (nicht `@icloud.com`/GMX/o.ä.).
- [ ] Nach der Domain-Authentifizierung eine Testanzeige an eine echte, von `RECIPIENT_EMAIL`
      verschiedene Melder-Adresse (Proton, GMX) senden und prüfen, dass die bcc-Kopie ohne
      Authentifizierungs-Warnung ankommt.
- [ ] Server-Log auf die neue `messageId`-Zeile prüfen (`console.log`-Ausgabe beim Versand).

## Manuelle Verifikation: Adress-Autocomplete + Pflicht-Hausnummer

Automatisiert (Unit-, e2e-Tests, Typecheck, Lint) bereits grün. Laut
Verifikations-Checkliste des ursprünglichen Plans (jetzt gelöscht, siehe
Git-Historie) fehlt noch der manuelle Durchklick im Dev-Server
(`npm run dev`):

- [ ] Beide Adressgruppen ("Deine Angaben" und Tatort) durchspielen: Tippen
      löst Vorschläge aus, Auswahl per Maus und per Tastatur funktioniert.
- [ ] Escape schließt das Dropdown.
- [ ] Klick/Tab außerhalb des Felds schließt das Dropdown ohne Auswahl.
- [ ] Rein manuelle Eingabe (ohne je eine Vorschlagsliste zu öffnen)
      funktioniert weiterhin, inkl. Validierungsfehler bei fehlender
      Hausnummer bei "Deine Angaben".
