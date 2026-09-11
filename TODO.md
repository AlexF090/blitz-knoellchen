# TODO

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
