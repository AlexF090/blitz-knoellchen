<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
	<title>Datenschutzerklärung – Blitz-Knöllchen</title>
</svelte:head>

<PageHeader linkHref={resolve('/')} linkLabel="Zurück" linkIcon="back" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 text-lg text-ink sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<h1 class="text-xl font-semibold tracking-tight text-ink md:text-2xl">Datenschutzerklärung</h1>

	<!-- max-w-prose begrenzt die Zeilenbreite auf eine lesbare Zeichenzahl (WCAG-AAA SC 1.4.8) —
		unabhängig von der Breite von <main>, die dem restlichen Seiten-Layout folgt. -->
	<div
		class="flex max-w-prose flex-col gap-4 leading-relaxed [&_h2]:mt-2 [&_h2]:font-semibold [&_h2]:text-ink"
	>
		<section>
			<h2>1. Verantwortlicher</h2>
			<p>
				Diese App wird privat und nicht-gewerblich betrieben, ausschließlich als schneller Weg, eine
				formlose Anzeige per E-Mail an die Bußgeldstelle der Stadt Köln zu verschicken.
				Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO):
			</p>
			<p class="mt-1 rounded-card bg-surface p-3 shadow-card">
				Kontakt: <a href="mailto:AlexF090@pm.me" class="underline">AlexF090@pm.me</a>
			</p>
		</section>

		<section>
			<h2>2. Übersicht der Datenverarbeitung</h2>
			<p>
				Die App verarbeitet personenbezogene Daten an drei Stellen: beim Auslesen der Foto-Metadaten
				direkt auf deinem Gerät, beim Ermitteln einer Adresse aus GPS-Koordinaten und beim Versand
				der fertigen Anzeige per E-Mail. Zusätzlich wird eine anonyme, cookie-lose
				Reichweitenmessung (Abschnitt 7) eingesetzt.
			</p>
		</section>

		<section>
			<h2>3. Foto und Metadaten (EXIF)</h2>
			<p>
				Das von dir aufgenommene oder ausgewählte Foto wird ausschließlich lokal in deinem Browser
				verarbeitet: Datum, Uhrzeit und GPS-Koordinaten werden aus den EXIF-Metadaten ausgelesen, um
				das Formular vorauszufüllen. Vor dem Versand wird das Foto in deinem Browser verkleinert und
				die Aufnahmezeit sowie der Standort erneut in die Bilddatei eingebettet, damit sich Ort und
				Zeit auch direkt am versendeten Beweisfoto nachvollziehen lassen. Dieser gesamte Vorgang
				läuft ausschließlich auf deinem Gerät; das Originalfoto verlässt es an dieser Stelle nicht.
			</p>
		</section>

		<section>
			<h2>4. Standortermittlung (Reverse Geocoding)</h2>
			<p>
				Um aus den GPS-Koordinaten des Fotos eine lesbare Adresse (Straße, Hausnummer, PLZ, Ort) zu
				ermitteln, sendet die App die Koordinaten über einen eigenen Server-Endpunkt an den
				Geocoding-Dienst <strong>LocationIQ</strong>. Ist dieser nicht erreichbar, wird ersatzweise
				der Dienst <strong>BigDataCloud</strong> angefragt. Beide Dienste erhalten dabei ausschließlich
				die Koordinaten, keine weiteren Formular- oder Profildaten. Gelingt die Ermittlung nicht, kannst
				du die Adresse manuell eingeben.
			</p>
			<p class="mt-2">
				<strong>LocationIQ</strong> (Unwired Labs, Indien) und <strong>BigDataCloud</strong> (Australien)
				sitzen außerhalb der EU/des EWR, in Ländern ohne Angemessenheitsbeschluss der EU-Kommission. Die
				Übermittlung der Koordinaten bzw. des eingetippten Adresstexts an diese Anbieter stellt daher
				eine Datenübermittlung in ein Drittland dar (Art. 44 ff. DSGVO). Laut eigenen Angaben von LocationIQ
				wird der Inhalt der Anfragen (Koordinaten bzw. Adresstext) dabei grundsätzlich nicht gespeichert
				oder protokolliert, sondern nur für die einzelne Anfrage verarbeitet.
			</p>
			<p class="mt-2">
				Zusätzlich bietet die App bei der manuellen Adresseingabe (sowohl bei deiner eigenen
				Anschrift als auch beim Tatort) eine Adressvorschlagsliste während des Tippens an. Dafür
				wird dein bereits eingetippter Text – anders als beim Reverse Geocoding oben – ebenfalls
				über einen eigenen Server-Endpunkt live an <strong>LocationIQ</strong> übertragen, um passende
				Vorschläge zu ermitteln; das kann auch bei deiner eigenen Adresse geschehen. Diese Anfragen laufen
				ohne Fallback auf BigDataCloud; schlägt die Anfrage fehl, erscheint einfach keine Vorschlagsliste.
			</p>
			<p class="mt-2">
				Rechtsgrundlage für beide Funktionen ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
				an einer schnell ausfüllbaren Anzeige, ohne die Adresse manuell recherchieren zu müssen).
			</p>
		</section>

		<section>
			<h2>5. Versand der Anzeige per E-Mail</h2>
			<p>
				Beim Absenden werden deine Angaben im Formular – Name, Anschrift, E-Mail-Adresse, ggf.
				Telefonnummer, Kennzeichen, Tatort, Tatzeit, Verstoßart, ggf. Anmerkungen sowie das
				Beweisfoto – über einen eigenen Server-Endpunkt an den E-Mail-Versanddienst <strong
					>Brevo</strong
				> (Sinch Engage GmbH, EU-Anbieter) übergeben, der die E-Mail im Namen dieser App an die Bußgeldstelle
				Köln verschickt. Deine E-Mail-Adresse wird dabei als Antwortadresse (Reply-To) sowie als Kopie-Empfänger
				(Bcc) hinterlegt, damit du automatisch eine Kopie der Anzeige erhältst – dein E-Mail-Postfach
				oder -Passwort wird dafür nicht benötigt und nicht abgefragt.
			</p>
			<p class="mt-2">
				Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung deines Wunsches, die Anzeige in
				deinem Auftrag zu versenden) bzw. lit. f (berechtigtes Interesse am reibungslosen Versand).
			</p>
		</section>

		<section>
			<h2>6. Lokale Speicherung auf deinem Gerät</h2>
			<p>
				Damit du bereits versendete Anzeigen nachschlagen kannst, speichert die App in der Historie
				ein komprimiertes Vorschaubild sowie die Eckdaten der Anzeige lokal in der
				<em>IndexedDB</em> deines Browsers – nicht auf einem Server. Dein Name, deine Anschrift,
				E-Mail-Adresse und ggf. Telefonnummer werden zusätzlich als Profil in derselben
				<em>IndexedDB</em> hinterlegt, damit das Formular beim nächsten Öffnen automatisch vorausgefüllt
				ist. Ein noch nicht abgesendeter Formularentwurf wird ebenfalls lokal zwischengespeichert und
				nach spätestens zwei Stunden automatisch verworfen.
			</p>
			<p class="mt-2">
				Diese Daten verlassen dein Gerät nicht von selbst und werden ausschließlich beim Absenden
				einer Anzeige (siehe Abschnitt 5) übertragen. Du kannst sie jederzeit über die
				Browser-Einstellungen (Website-Daten löschen) oder durch Deinstallation der App entfernen.
			</p>
		</section>

		<section>
			<h2>7. Hosting</h2>
			<p>
				Diese App wird über <strong>Vercel</strong> gehostet, Serverstandort Frankfurt am Main (Deutschland).
				Beim Aufruf der App verarbeitet Vercel technisch notwendige Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt
				des Zugriffs) zur Bereitstellung und Absicherung des Dienstes. Diese technischen Zugriffs-Logs
				werden von Vercel standardmäßig nur 1 Stunde vorgehalten (länger nur, falls der Betreiber optional
				erweitertes Logging hinzubucht). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
				Interesse am sicheren und stabilen Betrieb der App).
			</p>
			<p class="mt-2">
				Zusätzlich nutzt diese App <strong>Vercel Web Analytics</strong>, um anonyme, aggregierte
				Nutzungsstatistiken (z. B. Seitenaufrufe) zu erheben. Dieser Dienst arbeitet ohne Cookies
				und ohne dauerhafte Speicherung der IP-Adresse; eine Zuordnung zu dir als Person findet
				nicht statt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				Weiterentwicklung und Verbesserung der App auf Basis anonymer Nutzungszahlen).
			</p>
		</section>

		<section>
			<h2>8. Empfänger deiner Anzeige</h2>
			<p>
				Der Inhalt deiner Anzeige (Name, Anschrift, E-Mail-Adresse, ggf. Telefonnummer, Kennzeichen,
				Tatort, Tatzeit, Verstoßart, Anmerkungen, Beweisfoto) wird an die Bußgeldstelle der Stadt
				Köln übermittelt, damit diese den gemeldeten Verstoß bearbeiten kann. Diese Übermittlung ist
				der eigentliche Zweck der App und beruht auf deiner ausdrücklichen Anweisung beim Absenden
				des Formulars.
			</p>
		</section>

		<section>
			<h2>9. Daten des gemeldeten Fahrzeughalters bzw. Fahrers</h2>
			<p>
				Zweck der App ist es, einen Parkverstoß einer anderen Person anzuzeigen. Dabei werden neben
				deinen eigenen Angaben zwangsläufig auch personenbezogene Daten dieser Person verarbeitet
				und an die Bußgeldstelle Köln übermittelt: das Kennzeichen des Fahrzeugs, das Beweisfoto
				(das ggf. auch die Person selbst zeigen kann) sowie Tatort und Tatzeit. Diese Daten werden
				ausschließlich zur Erstattung der Anzeige verarbeitet, nicht für andere Zwecke gespeichert
				oder ausgewertet.
			</p>
			<p class="mt-2">
				Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				Anzeige von Verkehrsverstößen gegenüber der zuständigen Behörde). Nach Eingang der Anzeige
				bei der Bußgeldstelle Köln liegt die weitere Verarbeitung dieser Daten – einschließlich
				etwaiger Auskunfts- oder Löschungsansprüche der betroffenen Person – in der Verantwortung
				der Bußgeldstelle als datenverarbeitende Behörde, nicht mehr bei dieser App.
			</p>
		</section>

		<section>
			<h2>10. Deine Rechte</h2>
			<p>
				Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art.
				17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20
				DSGVO) sowie Widerspruch (Art. 21 DSGVO) gegen die Verarbeitung deiner Daten. Soweit Daten
				ausschließlich lokal auf deinem Gerät gespeichert sind (Abschnitt 6), kannst du diese Rechte
				direkt über deine Browser-Einstellungen wahrnehmen. Für alle anderen Anliegen wende dich an
				die oben genannte Kontaktadresse. Außerdem steht dir ein Beschwerderecht bei einer
				Datenschutz-Aufsichtsbehörde zu.
			</p>
		</section>

		<section>
			<h2>11. Speicherdauer</h2>
			<p>
				Bei <strong>Brevo</strong> werden die Transaktions-Logs des Versands (u. a. Zustellstatus)
				nach spätestens 1 Monat automatisch gelöscht – das ist die vom Betreiber dieser App
				eingestellte, kürzestmögliche Aufbewahrungsfrist. Wie lange die zugestellte E-Mail
				anschließend bei der <strong>Bußgeldstelle Köln</strong> verbleibt, richtet sich nach deren gesetzlichen
				Aufbewahrungspflichten; hierauf hat der Betreiber dieser App keinen Einfluss. Lokal auf deinem
				Gerät gespeicherte Daten (Abschnitt 6) bleiben bestehen, bis du sie selbst löschst.
			</p>
		</section>

		<section>
			<h2>12. Änderungen dieser Datenschutzerklärung</h2>
			<p>
				Diese Datenschutzerklärung wird bei Bedarf angepasst, wenn sich die Datenverarbeitung in der
				App ändert. Stand: September 2026.
			</p>
		</section>
	</div>
</main>
