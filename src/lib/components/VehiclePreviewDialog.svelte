<script lang="ts">
	/**
	 * Zeigt vor dem Absenden, wie die E-Mail für ein Fahrzeug aussieht: Empfänger, Betreff,
	 * Nachrichtentext und Anhänge.
	 */
	import type { City } from '$lib/config/cities';
	import {
		buildEmailTemplateInput,
		resolveVehicleIncidentTypes
	} from '$lib/email/buildEmailTemplateInput';
	import { buttonSecondary } from '$lib/ui/buttonStyles';
	import type { PhotoEntry, ProfileFields, VehicleEntry } from '$lib/validation/formSchema';
	import ConfirmDialog from './ConfirmDialog.svelte';

	interface Props {
		/** Wird per `bind:this` gesetzt; darüber öffnet der Aufrufer den Dialog. */
		dialog: HTMLDialogElement | undefined;
		vehicle: VehicleEntry;
		index: number;
		total: number;
		/** Alle Fotos der Anzeige — daraus werden die diesem Fahrzeug zugeordneten gefiltert. */
		pool: PhotoEntry[];
		city: City;
		profile: ProfileFields;
		recipientEmail: string;
		/**
		 * Leer = alle Pflichtfelder ausgefüllt; sonst wird statt der Vorschau aufgelistet, was
		 * fehlt.
		 */
		missingFieldMessages: string[];
	}

	let {
		dialog = $bindable(),
		vehicle,
		index,
		total,
		pool,
		city,
		profile,
		recipientEmail,
		missingFieldMessages
	}: Props = $props();

	const photos = $derived(
		vehicle.photoIds
			.map((id) => pool.find((p) => p.id === id))
			.filter((photo): photo is PhotoEntry => photo !== undefined)
	);

	const email = $derived.by(() => {
		if (missingFieldMessages.length > 0) return null;
		return city.buildEmailBody(
			buildEmailTemplateInput({
				profile,
				vehicle,
				incidentTypes: resolveVehicleIncidentTypes(city, vehicle),
				photoCount: vehicle.photoIds.length,
				vehicleIndex: index + 1,
				vehicleTotal: total
			})
		);
	});
</script>

<ConfirmDialog
	bind:dialog
	titleId="preview-dialog-title-{vehicle.id}"
	title={total > 1 ? `Vorschau: Fahrzeug ${index + 1} von ${total}` : 'Vorschau'}
	desktopMaxWidthClass="sm:max-w-2xl"
>
	{#if !email}
		<p class="mt-1 text-lg text-ink-muted">Noch nicht einklappbar, bitte prüfen:</p>
		<ul class="mt-1 list-disc pl-5 text-lg text-ink-muted">
			{#each missingFieldMessages as message (message)}
				<li>{message}</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-3 flex flex-col gap-3 text-lg">
			<div>
				<p class="text-base font-medium text-ink-muted">An</p>
				<p class="text-ink">{recipientEmail}</p>
			</div>
			<p class="text-base text-ink-muted">
				Eine Kopie geht zusätzlich an deine eigene Adresse{profile.email
					? ` (${profile.email})`
					: ''} — als Antwort-Adresse und BCC.
			</p>
			<div>
				<p class="text-base font-medium text-ink-muted">Betreff</p>
				<p class="text-ink">{email.subject}</p>
			</div>
			<div>
				<p class="text-base font-medium text-ink-muted">Nachricht</p>
				<pre
					class="mt-1 max-h-64 overflow-y-auto rounded-control border border-border bg-surface-sunken p-2 text-base whitespace-pre-wrap text-ink">{email.body}</pre>
			</div>
			{#if photos.length > 0}
				<div>
					<p class="text-base font-medium text-ink-muted">Anhang</p>
					<div class="mt-1 flex flex-wrap gap-2">
						{#each photos as photo, photoIndex (photo.id)}
							<img
								src={URL.createObjectURL(photo.blob)}
								alt="Beweisfoto {photoIndex + 1} von {photos.length}"
								loading="lazy"
								class="max-h-48 w-auto max-w-full rounded-control border border-border object-contain"
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
	{#snippet actions()}
		<button type="button" onclick={() => dialog?.close()} class="flex-1 {buttonSecondary}">
			Schließen
		</button>
	{/snippet}
</ConfirmDialog>
