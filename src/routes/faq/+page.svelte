<script lang="ts">
	/**
	 * FAQ-Seite: häufige Fragen als Accordion, getrennt nach Allgemeinem und Datenschutz.
	 * Die Antworten stehen als Snippets am Ende der Datei.
	 */
	import { resolve } from '$app/paths';
	import type { AccordionItem } from '#lib/components/Accordion.svelte';
	import Accordion from '#lib/components/Accordion.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';

	const generalItems: AccordionItem[] = [
		{
			id: 'was-macht-die-app',
			question: 'Was macht diese App, und muss ich dafür bezahlen?',
			answer: appSnippet
		},
		{
			id: 'mehrere-fahrzeuge',
			question: 'Kann ich mehrere Falschparker oder Fahrzeuge in einem Durchgang melden?',
			answer: mehrereFahrzeugeSnippet
		},
		{
			id: 'nach-dem-absenden',
			question: 'Was passiert, nachdem ich die Anzeige abgeschickt habe?',
			answer: nachDemAbsendenSnippet
		},
		{
			id: 'eingangsbestaetigung',
			question: 'Bekomme ich eine Eingangsbestätigung der Bußgeldstelle?',
			answer: eingangsbestaetigungSnippet
		}
	];

	const privacyItems: AccordionItem[] = [
		{
			id: 'verantwortlich-und-daten',
			question: 'Wer ist verantwortlich, und welche Daten verarbeitet die App überhaupt?',
			answer: verantwortlichUndDatenSnippet
		},
		{
			id: 'uebersicht-dienste',
			question: 'Wer bekommt welche Daten, wo werden sie gespeichert und wie lange?',
			answer: uebersichtSnippet
		},
		{
			id: 'foto-und-standort',
			question: 'Verlässt mein Foto mein Gerät, und woher weiß die App, wo der Verstoß war?',
			answer: fotoUndStandortSnippet
		},
		{
			id: 'versand-und-speicherung',
			question: 'Was passiert mit meinen Daten beim Versand, und speichert die App etwas lokal?',
			answer: versandUndSpeicherungSnippet
		}
	];
</script>

<svelte:head>
	<title>FAQ – Blitz-Knöllchen</title>
</svelte:head>

<PageHeader linkHref={resolve('/')} linkLabel="Zurück" linkIcon="back" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 text-lg text-ink sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<h1 class="text-xl font-semibold tracking-tight text-ink md:text-2xl">FAQ</h1>

	<div class="flex flex-col gap-6">
		<section class="flex flex-col gap-2">
			<h2 class="font-semibold text-ink">Allgemein</h2>
			<Accordion items={generalItems} />
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="font-semibold text-ink">Datenschutz</h2>
			<Accordion items={privacyItems} />
		</section>
	</div>
</main>

{#snippet appSnippet()}
	<p>
		Blitz-Knöllchen ist der schnellste Weg, einen Falschparker formlos bei der Bußgeldstelle Köln
		anzuzeigen: Foto machen – Datum, Uhrzeit und Adresse werden automatisch ausgelesen und
		vorausgefüllt –, kurz prüfen, absenden. Erkennt die App die Adresse einmal nicht, trägst du
		Straße, Hausnummer, PLZ und Ort einfach manuell ein; beim Tippen schlägt sie dir passende
		Adressen vor. Die App wird privat und nicht-gewerblich betrieben, für dich entstehen keine
		Kosten.
	</p>
{/snippet}

{#snippet mehrereFahrzeugeSnippet()}
	<p>
		Ja. Füge im selben Formular beliebig viele Fahrzeuge hinzu – je mit eigenem Foto, Verstoßart und
		Anmerkungen. Deine eigenen Angaben trägst du nur einmal ein; beim Absenden verschickt die App
		für jedes Fahrzeug automatisch eine eigene, vollständige Anzeige.
	</p>
{/snippet}

{#snippet nachDemAbsendenSnippet()}
	<p>
		Deine E-Mail-Adresse wird als Antwort- und Kopie-Empfänger (Bcc) hinterlegt, du bekommst also
		automatisch eine Kopie der Anzeige. Zusätzlich findest du sie in der Historie der App wieder,
		mit Vorschaubild und Eckdaten – gespeichert lokal auf deinem Gerät, nicht auf einem Server.
	</p>
{/snippet}

{#snippet eingangsbestaetigungSnippet()}
	<p>
		Nein, nicht direkt. Die Bußgeldstelle Köln verschickt eine automatische Eingangsbestätigung an
		die Absenderadresse der E-Mail – das ist die Adresse dieser App, nicht deine. Dein Beleg ist die
		Kopie (Bcc), die du beim Versand automatisch bekommst. Antwortet dir ein Sachbearbeiter, landet
		die Antwort direkt bei dir, weil deine Adresse als Antwortadresse hinterlegt ist.
	</p>
	<p class="mt-2">
		Die Eingangsbestätigung weist darauf hin, dass Einsprüche gegen einen Bescheid per einfacher
		E-Mail unzulässig sind. Das betrifft nur Betroffene eines Bußgeldbescheids, nicht deine Anzeige.
	</p>
	<p class="mt-2">
		Der Betreiber bewahrt die Antworten der Bußgeldstelle 6 Monate auf und löscht sie danach. So
		lange dauert es bei Parkverstößen höchstens, bis ein Fall verjährt ist: 3 Monate, solange kein
		Bußgeldbescheid ergangen ist, nach einem Bescheid 6 Monate (§ 26 Abs. 3 StVG).
	</p>
{/snippet}

{#snippet verantwortlichUndDatenSnippet()}
	<p>
		Der Betreiber dieser App (Kontakt siehe
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung, Abschnitt 1</a>)
		verarbeitet vor allem drei Arten von Daten: die Foto-Metadaten deines Beweisfotos, die daraus
		ermittelte Adresse sowie deine Angaben beim Versand der Anzeige. Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung (Abschnitt 2)</a>.
	</p>
{/snippet}

{#snippet uebersichtSnippet()}
	<p>
		Der Betreiber dieser App hat keinen eigenen Server und keine Datenbank – die App „kennt" deine
		Anzeige also nicht automatisch. Überblick, wer was bekommt, wo es liegt und wie lange:
	</p>
	<div class="-mx-3 mt-2 overflow-x-auto px-3">
		<table class="w-full min-w-160 border-collapse text-sm">
			<thead>
				<tr class="border-b border-border text-left">
					<th scope="col" class="py-2 pr-3 font-semibold">Stelle</th>
					<th scope="col" class="py-2 pr-3 font-semibold">Welche Daten</th>
					<th scope="col" class="py-2 pr-3 font-semibold">Speicherort</th>
					<th scope="col" class="py-2 pr-3 font-semibold">Speicherdauer</th>
					<th scope="col" class="py-2 font-semibold">Zugriff</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b border-border align-top">
					<td class="py-2 pr-3">Dein Gerät</td>
					<td class="py-2 pr-3">
						Profil (Name, Anschrift, E-Mail, ggf. Telefon), Historie, Formularentwurf
					</td>
					<td class="py-2 pr-3">IndexedDB deines Browsers</td>
					<td class="py-2 pr-3">Bis du sie selbst löschst (Entwurf: max. 7 Tage)</td>
					<td class="py-2">Nur du</td>
				</tr>
				<tr class="border-b border-border align-top">
					<td class="py-2 pr-3">Geoapify</td>
					<td class="py-2 pr-3">GPS-Koordinaten bzw. eingetippter Adresstext</td>
					<td class="py-2 pr-3">Beim Anbieter, in der EU</td>
					<td class="py-2 pr-3">Nur zur Beantwortung der Anfrage</td>
					<td class="py-2">Geoapify als Dienstleister</td>
				</tr>
				<tr class="border-b border-border align-top">
					<td class="py-2 pr-3">Brevo</td>
					<td class="py-2 pr-3">
						Vollständige Anzeige: Name, Anschrift, E-Mail, Kennzeichen, Tatort, Tatzeit, Verstoßart,
						Anmerkungen, Foto
					</td>
					<td class="py-2 pr-3">Bei Brevo (EU-Anbieter), zum Versand</td>
					<td class="py-2 pr-3">
						Logs: max. 1 Monat, dann automatisch gelöscht (vom Betreiber so eingestellt)
					</td>
					<td class="py-2">Brevo als Versanddienstleister</td>
				</tr>
				<tr class="border-b border-border align-top">
					<td class="py-2 pr-3">Bußgeldstelle Köln</td>
					<td class="py-2 pr-3">Vollständige Anzeige inkl. Foto</td>
					<td class="py-2 pr-3">Bei der Bußgeldstelle</td>
					<td class="py-2 pr-3">Nach deren gesetzlichen Aufbewahrungspflichten</td>
					<td class="py-2">Bußgeldstelle Köln</td>
				</tr>
				<tr class="border-b border-border align-top">
					<td class="py-2 pr-3">Postfach des Betreibers</td>
					<td class="py-2 pr-3">
						Antworten der Bußgeldstelle an die Absenderadresse der App, v. a. automatische
						Eingangsbestätigungen (Betreff ggf. mit Kennzeichen und Datum)
					</td>
					<td class="py-2 pr-3">E-Mail-Postfach bei Hetzner (Deutschland)</td>
					<td class="py-2 pr-3">6 Monate, so lange wie die Verjährung bei Parkverstößen</td>
					<td class="py-2">Betreiber</td>
				</tr>
				<tr class="align-top">
					<td class="py-2 pr-3">Cloudflare (Hosting)</td>
					<td class="py-2 pr-3">
						Technische Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt); Formulardaten nur auf dem Weg zu
						Brevo
					</td>
					<td class="py-2 pr-3">Weltweites Netz von Cloudflare</td>
					<td class="py-2 pr-3">Protokolle 3 Tage, Zähler für den Missbrauchsschutz 1 Minute</td>
					<td class="py-2">Cloudflare</td>
				</tr>
			</tbody>
		</table>
	</div>
	<p class="mt-2">
		Du bekommst beim Versand automatisch eine Kopie, der Betreiber nicht – er sieht den Inhalt
		einzelner Anzeigen also nicht, nur die Antworten der Bußgeldstelle an die Absenderadresse (mehr
		zum Empfänger Bußgeldstelle Köln in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung, Abschnitt 8</a>).
		Neben deinen eigenen Angaben werden zwangsläufig auch Daten der gemeldeten Person verarbeitet –
		Kennzeichen, Tatort, Tatzeit und das Beweisfoto, das ggf. auch die Person zeigt – ausschließlich
		zur Bearbeitung der Anzeige (<a href={resolve('/datenschutz')} class="underline">
			Datenschutzerklärung, Abschnitt 9
		</a>). Wie lange die Daten jeweils aufbewahrt werden, steht in der Tabelle oben; Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung (Abschnitt 11)</a>.
	</p>
{/snippet}

{#snippet fotoUndStandortSnippet()}
	<p>
		Nein, dein Foto verlässt dein Gerät nicht von selbst: Datum, Uhrzeit und GPS werden rein lokal
		aus den EXIF-Daten ausgelesen und vorausgefüllt, auch die Verkleinerung vor dem Versand läuft
		auf deinem Gerät (Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung, Abschnitt 3</a>). Für
		eine lesbare Adresse schickt die App nur die GPS-Koordinaten – bzw. beim manuellen Tippen den
		eingetippten Text – über einen eigenen Endpunkt an Geoapify, einen Anbieter mit Sitz und
		Verarbeitung in der EU (siehe Tabelle oben). Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung (Abschnitt 4)</a>.
	</p>
{/snippet}

{#snippet versandUndSpeicherungSnippet()}
	<p>
		Beim Absenden gehen deine Formularangaben über einen eigenen Endpunkt an Brevo (EU-Anbieter),
		der die E-Mail in deinem Auftrag an die Bußgeldstelle Köln verschickt – dein E-Mail-Postfach
		oder -Passwort wird dafür nicht benötigt (Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung, Abschnitt 5</a>).
		Zusätzlich liegen dein Profil, die Historie und ein noch nicht abgesendeter Formularentwurf
		(max. 7 Tage, beim Öffnen der App kannst du ihn fortsetzen oder verwerfen) lokal in der
		IndexedDB deines Browsers, nicht auf einem Server. Details in der
		<a href={resolve('/datenschutz')} class="underline">Datenschutzerklärung (Abschnitt 6)</a>.
	</p>
{/snippet}
