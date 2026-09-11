<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
	<title>Datenschutzerklärung – Blitz-Knöllchen</title>
</svelte:head>

<PageHeader title="Datenschutzerklärung" linkHref={resolve('/')} linkLabel="Zurück" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 text-sm text-ink sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<div class="flex flex-col gap-5 leading-relaxed [&_h2]:mt-2 [&_h2]:font-semibold [&_h2]:text-ink">
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
				der fertigen Anzeige per E-Mail. Es findet keine Analyse deines Nutzungsverhaltens statt –
				die App enthält keine Analyse-, Tracking- oder Werbe-Tools.
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
				Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer schnell
				ausfüllbaren Anzeige, ohne die Adresse manuell recherchieren zu müssen).
			</p>
		</section>

		<section>
			<h2>5. Versand der Anzeige per E-Mail</h2>
			<p>
				Beim Absenden werden deine Angaben im Formular – Name, Anschrift, E-Mail-Adresse,
				Kennzeichen, Tatort, Tatzeit, Verstoßart, ggf. Anmerkungen sowie das Beweisfoto – über einen
				eigenen Server-Endpunkt an den E-Mail-Versanddienst <strong>Brevo</strong> (Sinch Engage GmbH,
				EU-Anbieter) übergeben, der die E-Mail im Namen dieser App an die Bußgeldstelle Köln verschickt.
				Deine E-Mail-Adresse wird dabei als Antwortadresse (Reply-To) sowie als Kopie-Empfänger (Bcc)
				hinterlegt, damit du automatisch eine Kopie der Anzeige erhältst – dein E-Mail-Postfach oder -Passwort
				wird dafür nicht benötigt und nicht abgefragt.
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
				<em>IndexedDB</em> deines Browsers – nicht auf einem Server. Dein Name, deine Anschrift und
				E-Mail-Adresse werden zusätzlich im <em>localStorage</em> deines Browsers hinterlegt, damit das
				Formular beim nächsten Öffnen automatisch vorausgefüllt ist. Ein noch nicht abgesendeter Formularentwurf
				wird ebenfalls lokal zwischengespeichert und nach spätestens zwei Stunden automatisch verworfen.
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
				des Zugriffs) zur Bereitstellung und Absicherung des Dienstes. Rechtsgrundlage ist Art. 6 Abs.
				1 lit. f DSGVO (berechtigtes Interesse am sicheren und stabilen Betrieb der App).
			</p>
		</section>

		<section>
			<h2>8. Empfänger deiner Anzeige</h2>
			<p>
				Der Inhalt deiner Anzeige (Name, Anschrift, E-Mail-Adresse, Kennzeichen, Tatort, Tatzeit,
				Verstoßart, Anmerkungen, Beweisfoto) wird an die Bußgeldstelle der Stadt Köln übermittelt,
				damit diese den gemeldeten Verstoß bearbeiten kann. Diese Übermittlung ist der eigentliche
				Zweck der App und beruht auf deiner ausdrücklichen Anweisung beim Absenden des Formulars.
			</p>
		</section>

		<section>
			<h2>9. Deine Rechte</h2>
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
			<h2>10. Speicherdauer</h2>
			<p>
				Daten, die zum Versand der Anzeige an Brevo bzw. die Bußgeldstelle Köln übermittelt werden,
				verbleiben so lange dort, wie es für die Bearbeitung des Verstoßes bzw. gesetzliche
				Aufbewahrungspflichten erforderlich ist; hierauf hat der Betreiber dieser App keinen
				Einfluss. Lokal auf deinem Gerät gespeicherte Daten (Abschnitt 6) bleiben bestehen, bis du
				sie selbst löschst.
			</p>
		</section>

		<section>
			<h2>11. Änderungen dieser Datenschutzerklärung</h2>
			<p>
				Diese Datenschutzerklärung wird bei Bedarf angepasst, wenn sich die Datenverarbeitung in der
				App ändert. Stand: September 2026.
			</p>
		</section>
	</div>
</main>
