<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { SITE_OPERATOR } from '#lib/site.ts';

	// Vorab zusammengesetzt: Svelte ergänzt in gemischten Template-Ausdrücken sonst `?? ''`-Zweige.
	const { generalEmail, supportEmail } = SITE_OPERATOR;
	const addressLines = [
		SITE_OPERATOR.name,
		SITE_OPERATOR.street,
		`${SITE_OPERATOR.postalCode} ${SITE_OPERATOR.city}`,
		SITE_OPERATOR.country
	];
	const generalMailtoHref = `mailto:${generalEmail}`;
	const supportMailtoHref = `mailto:${supportEmail}`;
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
			<address class="mt-1 rounded-card bg-surface p-3 not-italic shadow-card">
				{#each addressLines as line (line)}
					<span class="block">{line}</span>
				{/each}
			</address>
			<p class="mt-2">
				Allgemeiner Kontakt:
				<a href={generalMailtoHref} class="underline">
					{generalEmail}
				</a>
				<br />
				Fragen zu dieser App und zum Datenschutz:
				<a href={supportMailtoHref} class="underline">
					{supportEmail}
				</a>
			</p>
		</section>

		<section>
			<h2>2. Übersicht der Datenverarbeitung</h2>
			<p>
				Die App verarbeitet personenbezogene Daten an drei Stellen: beim Auslesen der Foto-Metadaten
				direkt auf deinem Gerät, beim Ermitteln einer Adresse aus GPS-Koordinaten und beim Versand
				der fertigen Anzeige per E-Mail. Antworten der Bußgeldstelle an die Absenderadresse der App
				bewahrt der Betreiber befristet auf (Abschnitte 5 und 11). Eine Reichweitenmessung oder
				Analyse deines Nutzungsverhaltens findet nicht statt, Cookies werden nicht gesetzt.
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
				Geocoding-Dienst <strong>Geoapify</strong>. Geoapify erhält dabei ausschließlich die
				Koordinaten, keine weiteren Formular- oder Profildaten. Gelingt die Ermittlung nicht, kannst
				du die Adresse manuell eingeben.
			</p>
			<p class="mt-2">
				Zusätzlich bietet die App bei der manuellen Adresseingabe (sowohl bei deiner eigenen
				Anschrift als auch beim Tatort) eine Adressvorschlagsliste während des Tippens an. Dafür
				wird dein bereits eingetippter Text über einen eigenen Server-Endpunkt an Geoapify
				übertragen, um passende Vorschläge zu ermitteln; das kann auch bei deiner eigenen Adresse
				geschehen. Schlägt die Anfrage fehl, erscheint einfach keine Vorschlagsliste.
			</p>
			<p class="mt-2">
				Geoapify ist ein Anbieter mit Sitz in der EU; die App nutzt dessen EU-Endpunkt, die
				Verarbeitung findet laut Auftragsverarbeitungsvertrag in der EU bzw. im EWR statt. Mit
				Geoapify besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
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
				Beweisfoto – über einen eigenen Server-Endpunkt an den E-Mail-Versanddienst <strong>
					Brevo
				</strong> (Brevo GmbH, Berlin, EU-Anbieter) übergeben, der die E-Mail im Namen dieser App an die
				Bußgeldstelle Köln verschickt. Deine E-Mail-Adresse wird dabei als Antwortadresse (Reply-To) sowie
				als Kopie-Empfänger (Bcc) hinterlegt, damit du automatisch eine Kopie der Anzeige erhältst – dein
				E-Mail-Postfach oder -Passwort wird dafür nicht benötigt und nicht abgefragt. Mit Brevo besteht
				ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (Teil der Nutzungsbedingungen von Brevo).
			</p>
			<p class="mt-2">
				Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung deines Wunsches, die Anzeige in
				deinem Auftrag zu versenden) bzw. lit. f (berechtigtes Interesse am reibungslosen Versand).
			</p>
			<p class="mt-2">
				Absender der E-Mail ist die Adresse dieser App. Antworten an diese Adresse – vor allem die
				automatische Eingangsbestätigung der Bußgeldstelle – gehen deshalb nicht an dich, sondern in
				das E-Mail-Postfach des Betreibers bei der <strong>Hetzner Online GmbH</strong> (Gunzenhausen,
				Deutschland). Sie enthalten in der Regel nur einen Standardtext und den Betreff der Anzeige mit
				Kennzeichen und Datum. Der Betreiber bewahrt sie als Nachweis des Versands auf und, falls die
				Bußgeldstelle Rückfragen an diese Adresse schickt, um sie an dich weiterzuleiten. Rechtsgrundlage
				ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am Nachweis des Versands und an der Bearbeitung
				von Rückfragen). Mit Hetzner besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
			</p>
		</section>

		<section>
			<h2>6. Lokale Speicherung auf deinem Gerät</h2>
			<p>
				Damit du bereits versendete Anzeigen nachschlagen kannst, speichert die App in der Historie
				ein komprimiertes Vorschaubild sowie die Eckdaten der Anzeige lokal in der
				<em>IndexedDB</em> deines Browsers – nicht auf einem Server. Dein Name, deine Anschrift,
				E-Mail-Adresse und ggf. Telefonnummer werden zusätzlich als Profil in derselben
				<em>IndexedDB</em> hinterlegt, damit das Formular beim nächsten Öffnen automatisch
				vorausgefüllt ist. Ein noch nicht abgesendeter Formularentwurf wird ebenfalls lokal in der
				<em>IndexedDB</em>
				zwischengespeichert, bis du ihn absendest oder verwirfst, höchstens aber sieben Tage. Er umfasst
				die Formularinhalte, die Fotos und den Ansichtszustand (zugeklappte Karten, Scrollposition). Beim
				Öffnen der App wirst du gefragt, ob du den Entwurf fortsetzen oder verwerfen möchtest.
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
				Diese App läuft auf der Plattform <strong>Cloudflare Workers</strong> der Cloudflare, Inc. (USA).
				Cloudflare betreibt außerdem die DNS-Auflösung der Domain appool.de. Die App wird über das weltweite
				Netz von Cloudflare ausgeliefert; ein fester Serverstandort lässt sich dabei nicht festlegen.
				Beim Aufruf verarbeitet Cloudflare technisch notwendige Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt,
				aufgerufene Adresse) und beim Absenden die Formulardaten auf dem Weg zu Brevo. Protokolle der
				Server-Endpunkte (ohne Formularinhalte) werden 3 Tage aufbewahrt. Rechtsgrundlage ist Art. 6 Abs.
				1 lit. f DSGVO (berechtigtes Interesse am sicheren und stabilen Betrieb der App).
			</p>
			<p class="mt-2">
				Zum Schutz vor Missbrauch begrenzt die App, wie viele Anzeigen und Adressabfragen pro Minute
				von einer IP-Adresse aus möglich sind. Dafür zählt Cloudflare die Anfragen pro IP-Adresse
				kurzzeitig, die Zähler verfallen nach einer Minute. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
				DSGVO (berechtigtes Interesse, den Versand von E-Mails über die App vor Missbrauch zu
				schützen).
			</p>
			<p class="mt-2">
				Da Cloudflare ein US-Unternehmen ist, kann eine Übermittlung in ein Drittland stattfinden
				(Art. 44 ff. DSGVO). Sie stützt sich auf das EU-US Data Privacy Framework
				(Angemessenheitsbeschluss der EU-Kommission) und ergänzend auf Standardvertragsklauseln. Mit
				Cloudflare besteht ein Auftragsverarbeitungsvertrag (Data Processing Addendum) nach Art. 28
				DSGVO.
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
			<p class="mt-2">
				Im <strong>Demo-Modus</strong> geht die Anzeige nicht an die Bußgeldstelle, sondern an eine Test-Adresse
				des Betreibers. Er dient nur zum Ausprobieren; der Betreiber löscht solche Test-Anzeigen ohne
				weitere Verwendung.
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
			<p class="mt-2">
				Die gemeldete Person wird durch diese App nicht gesondert informiert (Art. 14 Abs. 5 lit. b
				DSGVO): Der Betreiber kennt weder ihren Namen noch ihre Anschrift und könnte sie nur über
				das Kennzeichen ermitteln, was mit einem unverhältnismäßigen Aufwand und einem zusätzlichen
				Eingriff verbunden wäre. Sie erfährt von der Anzeige im Verfahren der Bußgeldstelle.
			</p>
		</section>

		<section>
			<h2>10. Deine Rechte</h2>
			<p>
				Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art.
				17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20
				DSGVO) und Datenübertragbarkeit (Art. 20 DSGVO). Soweit Daten ausschließlich lokal auf
				deinem Gerät gespeichert sind (Abschnitt 6), kannst du diese Rechte direkt über deine
				Browser-Einstellungen wahrnehmen. Für alle anderen Anliegen wende dich an die oben genannte
				Kontaktadresse.
			</p>
			<p class="mt-2 rounded-card bg-surface p-3 shadow-card">
				<strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Soweit eine Verarbeitung auf Art. 6 Abs. 1
				lit. f DSGVO beruht, kannst du ihr aus Gründen, die sich aus deiner besonderen Situation ergeben,
				jederzeit widersprechen. Eine formlose Nachricht an die oben genannte Kontaktadresse genügt.
			</p>
			<p class="mt-2">
				Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
				Zuständig für den Betreiber ist die Landesbeauftragte für Datenschutz und
				Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.
			</p>
			<p class="mt-2">
				Die Nutzung der App ist freiwillig; du bist weder gesetzlich noch vertraglich verpflichtet,
				Daten anzugeben. Ohne Name, Anschrift und E-Mail-Adresse kann die Anzeige allerdings nicht
				versendet werden, weil die Bußgeldstelle anonyme Anzeigen nicht verfolgt. Eine
				automatisierte Entscheidungsfindung einschließlich Profiling (Art. 22 DSGVO) findet nicht
				statt.
			</p>
		</section>

		<section>
			<h2>11. Speicherdauer</h2>
			<p>
				Bei <strong>Brevo</strong> werden die Transaktions-Logs des Versands (u. a. Zustellstatus)
				nach spätestens 1 Monat automatisch gelöscht – das ist die vom Betreiber dieser App
				eingestellte, kürzestmögliche Aufbewahrungsfrist. Wie lange die zugestellte E-Mail
				anschließend bei der <strong>Bußgeldstelle Köln</strong> verbleibt, richtet sich nach deren gesetzlichen
				Aufbewahrungspflichten; hierauf hat der Betreiber dieser App keinen Einfluss. Antworten der Bußgeldstelle
				im Postfach des Betreibers (Abschnitt 5) werden nach 6 Monaten gelöscht. So lange dauert es bei
				Parkverstößen höchstens, bis ein Fall verjährt ist: 3 Monate, solange kein Bußgeldbescheid ergangen
				ist, nach einem Bescheid 6 Monate (§ 26 Abs. 3 StVG). Lokal auf deinem Gerät gespeicherte Daten
				(Abschnitt 6) bleiben bestehen, bis du sie selbst löschst.
			</p>
		</section>

		<section>
			<h2>12. Änderungen dieser Datenschutzerklärung</h2>
			<p>
				Diese Datenschutzerklärung wird bei Bedarf angepasst, wenn sich die Datenverarbeitung in der
				App ändert. Stand: November 2026.
			</p>
		</section>
	</div>
</main>
