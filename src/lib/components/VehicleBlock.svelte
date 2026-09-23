<script lang="ts">
	/**
	 * Eine auf- und zuklappbare Karte pro gemeldetem Fahrzeug: Fotoauswahl, Tatort, Fahrzeugdaten
	 * und Verstöße. Zugeklappt zeigt sie nur noch die Zusammenfassung.
	 */
	import type { City, IncidentType } from '$lib/config/cities';
	import { INCIDENT_TYPE_ICONS } from '$lib/config/incidentTypeIcons';
	import { getVehicleAccentClass } from '$lib/config/vehicleColors';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { buildVehicleSummaryRows } from '$lib/report/vehicleSummary';
	import { buttonDestructive, buttonPrimary, buttonSecondary } from '$lib/ui/buttonStyles';
	import { inputBase } from '$lib/ui/inputStyles';
	import { onEnterKey } from '$lib/ui/onEnterKey';
	import type {
		PhotoEntry,
		ProfileFields,
		VehicleEntry,
		VehicleErrors
	} from '$lib/validation/formSchema';
	import { validateVehicle } from '$lib/validation/formSchema';
	import { Eye, RotateCcw, Trash2 } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import FormField from './FormField.svelte';
	import IncidentLocationFieldset from './IncidentLocationFieldset.svelte';
	import SummaryList from './SummaryList.svelte';
	import VehicleDetailsFieldset from './VehicleDetailsFieldset.svelte';
	import VehiclePreviewDialog from './VehiclePreviewDialog.svelte';

	interface Props {
		vehicle: VehicleEntry;
		index: number;
		total: number;
		errors?: VehicleErrors;
		pool: PhotoEntry[];
		incidentTypes: IncidentType[];
		maxPhotos: number;
		/** Hinweis, wenn sich der Tatort nicht vollständig aus dem Foto ableiten ließ. */
		geocodeWarning?: string;
		/** „Deine Angaben“ — nur für die E-Mail-Vorschau, wird hier nicht bearbeitet. */
		profile: ProfileFields;
		city: City;
		recipientEmail: string;
		onRemove: () => void;
		onReset: () => void;
		/** Meldet jede Änderung der Fotoauswahl, damit der Aufrufer EXIF-Daten übernehmen kann. */
		onPhotoToggled?: (photoId: string, selected: boolean) => void;
	}

	let {
		vehicle = $bindable(),
		index,
		total,
		errors,
		pool,
		incidentTypes,
		maxPhotos,
		geocodeWarning,
		profile,
		city,
		recipientEmail,
		onRemove,
		onReset,
		onPhotoToggled
	}: Props = $props();

	let open = $state(true);
	let resetDialog = $state<HTMLDialogElement | undefined>(undefined);
	let previewDialog = $state<HTMLDialogElement | undefined>(undefined);

	/** Öffnet die Rückfrage vor dem Entfernen bzw. Zurücksetzen dieser Karte. */
	const openResetDialog = () => resetDialog?.showModal();

	/** Öffnet die E-Mail-Vorschau, sobald alle Pflichtfelder ausgefüllt sind. */
	const openPreviewDialog = () => isComplete && previewDialog?.showModal();

	/** Entfernt die Karte, solange es weitere gibt — sonst wird die letzte nur geleert. */
	const confirmReset = () => {
		resetDialog?.close();
		triggerHaptic('warning');
		if (total > 1) onRemove();
		else onReset();
	};

	/** Macht einen Foto-Blob als `src` verwendbar. */
	const objectUrl = (blob: Blob) => URL.createObjectURL(blob);

	const missingFieldMessages = $derived(Object.values(validateVehicle(vehicle, pool)));

	const isComplete = $derived(missingFieldMessages.length === 0);

	// Werden Angaben nachträglich unvollständig (z.B. ein Foto wird andernorts aus dem Pool
	// entfernt), klappt die Karte wieder auf — sonst bliebe der Mangel unsichtbar.
	$effect(() => {
		if (!isComplete && !open) open = true;
	});

	/** Nimmt ein Foto in die Auswahl dieses Fahrzeugs auf oder entfernt es wieder. */
	const togglePhoto = (photoId: string) => {
		if (vehicle.photoIds.includes(photoId)) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
			onPhotoToggled?.(photoId, false);
		} else if (vehicle.photoIds.length < maxPhotos) {
			vehicle.photoIds = [...vehicle.photoIds, photoId];
			onPhotoToggled?.(photoId, true);
		}
	};

	/** Setzt oder entfernt eine Verstoßart in der Mehrfachauswahl. */
	const toggleIncidentType = (id: string, checked: boolean) => {
		vehicle.incidentTypeIds = checked
			? [...vehicle.incidentTypeIds, id]
			: vehicle.incidentTypeIds.filter((existing) => existing !== id);
	};

	/**
	 * Klappt die Karte bei Enter in den Lese-Modus (analog zu „Fertig“). Ohne diesen Handler
	 * würde Enter die gesamte Anzeige abschicken — die Felder liegen im selben `form`-Element wie
	 * der Absenden-Button.
	 */
	const onVehicleFieldKeydown = onEnterKey(() => {
		if (isComplete) open = false;
	});
</script>

<div
	class="rounded-card border-l-4 {getVehicleAccentClass(index)} bg-surface p-4 shadow-card sm:p-6"
>
	<div class="flex items-center justify-between gap-2">
		<div>
			<h3 class="text-lg font-semibold text-ink md:text-xl">
				{total > 1 ? `Vorfall ${index + 1}` : 'Vorfall'}
			</h3>
			<p class="text-base text-ink-muted">Betrifft ein Fahrzeug</p>
		</div>
		<button
			type="button"
			onclick={openResetDialog}
			aria-label={total > 1 ? 'Vorfall entfernen' : 'Vorfall zurücksetzen'}
			title={total > 1 ? 'Entfernen' : 'Zurücksetzen'}
			class="flex size-11 items-center justify-center rounded-full text-error-fg hover:bg-error-fg/10"
		>
			{#if total > 1}
				<Trash2 class="size-5" aria-hidden="true" />
			{:else}
				<RotateCcw class="size-5" aria-hidden="true" />
			{/if}
		</button>
	</div>

	{#if !open}
		<div transition:fade={{ duration: transitionDuration(150) }}>
			<SummaryList rows={buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: true })}>
				{#snippet leading()}
					<div>
						<dt class="text-base font-medium text-ink-muted">Fotos</dt>
						{#if vehicle.photoIds.length > 0}
							<dd class="mt-1 flex flex-wrap gap-2">
								{#each vehicle.photoIds as photoId, photoIndex (photoId)}
									{@const photo = pool.find((p) => p.id === photoId)}
									{#if photo}
										<img
											src={objectUrl(photo.blob)}
											alt="Beweisfoto {photoIndex + 1} von {vehicle.photoIds.length}"
											width="56"
											height="56"
											class="size-14 rounded-control border border-border object-cover"
										/>
									{/if}
								{/each}
							</dd>
						{:else}
							<dd class="text-ink">—</dd>
						{/if}
					</div>
				{/snippet}
			</SummaryList>
		</div>
		{#if errors}
			<p role="alert" class="mt-1 text-lg text-error-fg">Angaben unvollständig</p>
		{/if}
	{/if}

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div onkeydown={onVehicleFieldKeydown}>
			<div class="mt-3">
				<p class="text-lg font-medium text-ink">
					Fotos mit diesem Fahrzeug
					<span class="whitespace-nowrap">
						(max. {maxPhotos}) <span class="text-error-fg">*</span>
					</span>
				</p>
				{#if pool.length === 0}
					<p class="mt-1 text-lg text-ink-muted">Zuerst oben ein Foto hinzufügen.</p>
				{:else}
					<div class="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
						{#each pool as photo (photo.id)}
							{@const selected = vehicle.photoIds.includes(photo.id)}
							<button
								type="button"
								onclick={() => togglePhoto(photo.id)}
								class="relative aspect-square overflow-hidden rounded-control border border-border"
								class:ring-2={selected}
								class:ring-primary-500={selected}
								aria-pressed={selected}
							>
								<img
									src={objectUrl(photo.blob)}
									alt="Foto {photo.fileName} auswählen"
									width="96"
									height="96"
									class="size-full object-cover"
								/>
								{#if selected}
									<span
										aria-hidden="true"
										class="absolute inset-0 flex items-center justify-center bg-primary-600/40 text-on-primary"
										>✓</span
									>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				{#if errors?.photoIds}<p role="alert" class="mt-1 text-lg text-error-fg">
						{errors.photoIds}
					</p>{/if}
			</div>

			<IncidentLocationFieldset bind:vehicle {errors} {geocodeWarning} />

			<VehicleDetailsFieldset bind:vehicle {errors} />

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-lg font-medium text-ink">
					Verstöße <span class="text-error-fg">*</span>
				</legend>
				<p class="text-base text-ink-muted">Art des Verstoßes (Mehrfachauswahl möglich)</p>
				<div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#each incidentTypes as type (type.id)}
						{@const Icon = INCIDENT_TYPE_ICONS[type.id]}
						<label class="flex cursor-pointer items-center gap-2 py-2.5 text-lg text-ink">
							<input
								type="checkbox"
								checked={vehicle.incidentTypeIds.includes(type.id)}
								onchange={(e) => toggleIncidentType(type.id, e.currentTarget.checked)}
								class="size-4 rounded border-border"
							/>
							<span class="flex items-center gap-1.5">
								{type.label}
								{#if Icon}
									<Icon class="size-5 shrink-0" aria-hidden="true" />
								{/if}
							</span>
						</label>
					{/each}
				</div>
				{#if errors?.incidentTypeIds}<p role="alert" class="mt-1 text-lg text-error-fg">
						{errors.incidentTypeIds}
					</p>{/if}
			</fieldset>

			<div class="mt-3">
				<FormField id="notes-{vehicle.id}" label="Weitere Angaben (optional)" wrapperClass="">
					{#snippet control()}
						<textarea
							id="notes-{vehicle.id}"
							name="notes-{vehicle.id}"
							bind:value={vehicle.notes}
							class={inputBase}></textarea>
					{/snippet}
				</FormField>
			</div>
		</div>
	{/if}

	<div class="mt-4">
		<div class="flex items-center gap-6">
			<button
				type="button"
				onclick={openPreviewDialog}
				disabled={!isComplete}
				title={isComplete ? undefined : 'Erst verfügbar, wenn alle Pflichtfelder ausgefüllt sind.'}
				class="flex flex-1 items-center justify-center gap-1 {buttonSecondary} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Eye class="size-4" aria-hidden="true" />
				Vorschau
			</button>
			{#if open}
				<button
					type="button"
					onclick={() => isComplete && (open = false)}
					disabled={!isComplete}
					class="flex flex-1 items-center justify-center gap-1 {buttonPrimary} disabled:cursor-not-allowed disabled:bg-border disabled:text-ink-muted"
					aria-expanded={open}
				>
					Fertig
				</button>
			{:else}
				<button
					type="button"
					onclick={() => (open = true)}
					class="flex flex-1 items-center justify-center gap-1 {buttonSecondary}"
					aria-expanded={open}
				>
					Bearbeiten
				</button>
			{/if}
		</div>
		{#if open && !isComplete}
			<div
				role="status"
				transition:fade={{ duration: transitionDuration(150) }}
				class="mt-1 text-lg text-ink-muted"
			>
				<p>Noch nicht einklappbar, bitte prüfen:</p>
				<ul class="mt-1 list-disc pl-5">
					{#each missingFieldMessages as message (message)}
						<li>{message}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

<ConfirmDialog
	bind:dialog={resetDialog}
	titleId="reset-dialog-title-{vehicle.id}"
	title={total > 1 ? 'Fahrzeug/Vorgang entfernen?' : 'Fahrzeug/Vorgang zurücksetzen?'}
>
	<p class="mt-1 text-lg text-ink-muted">
		{total > 1
			? 'Dieser Datensatz wird unwiderruflich aus der Anzeige entfernt.'
			: 'Die bereits eingetragenen Daten werden unwiderruflich gelöscht.'}
	</p>

	<SummaryList rows={buildVehicleSummaryRows(vehicle, incidentTypes, { includeEmpty: false })}>
		{#snippet leading()}
			{#if vehicle.photoIds.length > 0}
				<div>
					<dt class="text-base font-medium text-ink-muted">Foto Auswahl</dt>
					<dd class="text-ink">{vehicle.photoIds.length}</dd>
				</div>
			{/if}
		{/snippet}
	</SummaryList>
	{#snippet actions()}
		<button type="button" onclick={() => resetDialog?.close()} class="flex-1 {buttonSecondary}">
			Abbrechen
		</button>
		<button type="button" onclick={confirmReset} class="flex-1 {buttonDestructive}">
			Entfernen
		</button>
	{/snippet}
</ConfirmDialog>

<VehiclePreviewDialog
	bind:dialog={previewDialog}
	{vehicle}
	{index}
	{total}
	{pool}
	{city}
	{profile}
	{recipientEmail}
	{missingFieldMessages}
/>
