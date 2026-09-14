<script lang="ts">
	import type { City, IncidentType } from '$lib/config/cities';
	import { INCIDENT_TYPE_ICONS } from '$lib/config/incidentTypeIcons';
	import { getVehicleAccentClass } from '$lib/config/vehicleColors';
	import { VEHICLE_MAKES } from '$lib/config/vehicleMakes';
	import { VEHICLE_TYPES } from '$lib/config/vehicleTypes';
	import {
		buildEmailTemplateInput,
		resolveVehicleIncidentTypes
	} from '$lib/email/buildEmailTemplateInput';
	import { applyAddressSuggestion } from '$lib/geocode/applyAddressSuggestion';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { buildVehicleSummaryRows } from '$lib/report/vehicleSummary';
	import { buttonDestructive, buttonPrimary, buttonSecondary } from '$lib/ui/buttonStyles';
	import { inputBase } from '$lib/ui/inputStyles';
	import { onEnterKey } from '$lib/ui/onEnterKey';
	import { ariaFieldProps } from '$lib/validation/ariaField';
	import type {
		PhotoEntry,
		ProfileFields,
		VehicleEntry,
		VehicleErrors
	} from '$lib/validation/formSchema';
	import { normalizeLicensePlate, validateVehicle } from '$lib/validation/formSchema';
	import { Eye, RotateCcw, Trash2 } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import AddressAutocomplete from './AddressAutocomplete.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import FormField from './FormField.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import SummaryList from './SummaryList.svelte';

	interface Props {
		vehicle: VehicleEntry;
		index: number;
		total: number;
		errors?: VehicleErrors;
		pool: PhotoEntry[];
		incidentTypes: IncidentType[];
		maxPhotos: number;
		geocodeWarning?: string;
		profile: ProfileFields;
		city: City;
		recipientEmail: string;
		onRemove: () => void;
		onReset: () => void;
		onPhotoToggled?: (photoId: string, selected: boolean) => void;
	}

	let {
		vehicle,
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

	const openResetDialog = () => resetDialog?.showModal();
	const openPreviewDialog = () => isComplete && previewDialog?.showModal();

	const previewPhotos = $derived(
		vehicle.photoIds
			.map((id) => pool.find((p) => p.id === id))
			.filter((photo): photo is PhotoEntry => photo !== undefined)
	);

	const previewEmail = $derived.by(() => {
		if (!isComplete) return null;
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

	const confirmReset = () => {
		resetDialog?.close();
		triggerHaptic('warning');
		if (total > 1) onRemove();
		else onReset();
	};

	// Kennzeichen bestehen international nur aus Großbuchstaben — kleingeschriebene Eingaben
	// werden beim Tippen live großgeschrieben. `toUpperCase()` ändert die String-Länge nicht,
	// daher muss die Cursorposition nur nach dem manuellen Setzen von `input.value` (das den
	// Cursor sonst ans Ende springen lassen würde) wiederhergestellt werden.
	const handleLicensePlateInput = (event: Event & { currentTarget: HTMLInputElement }) => {
		const input = event.currentTarget;
		const { selectionStart, selectionEnd } = input;
		const uppercased = input.value.toUpperCase();
		input.value = uppercased;
		input.setSelectionRange(selectionStart, selectionEnd);
		vehicle.licensePlate = uppercased;
	};

	// Beim Verlassen des Feldes zusätzlich ins kanonische Format bringen (z. B. "K AB 1234" ->
	// "K-AB1234") — dieselbe Funktion, die auch beim Absenden genutzt wird, hier nur schon
	// vorab für sichtbares Feedback.
	const handleLicensePlateBlur = () => {
		vehicle.licensePlate = normalizeLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry);
	};

	const objectUrl = (blob: Blob) => URL.createObjectURL(blob);

	const selectHalteverstoss = () => {
		vehicle.timeMode = 'halteverstoss';
		vehicle.endTime = '';
		triggerHaptic('selection');
	};
	const selectParkverstoss = () => {
		vehicle.timeMode = 'parkverstoss';
		triggerHaptic('selection');
	};

	const missingFieldMessages = $derived(Object.values(validateVehicle(vehicle, pool)));

	const isComplete = $derived(missingFieldMessages.length === 0);

	// Falls sich Angaben nachträglich als unvollständig herausstellen (z.B. ein Foto wird
	// andernorts aus dem Pool entfernt), zwingt das die zugeklappte Karte wieder auf, statt
	// unvollständige Angaben unsichtbar zu lassen.
	$effect(() => {
		if (!isComplete && !open) open = true;
	});

	const togglePhoto = (photoId: string) => {
		if (vehicle.photoIds.includes(photoId)) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
			onPhotoToggled?.(photoId, false);
		} else if (vehicle.photoIds.length < maxPhotos) {
			vehicle.photoIds = [...vehicle.photoIds, photoId];
			onPhotoToggled?.(photoId, true);
		}
	};

	const toggleIncidentType = (id: string, checked: boolean) => {
		vehicle.incidentTypeIds = checked
			? [...vehicle.incidentTypeIds, id]
			: vehicle.incidentTypeIds.filter((existing) => existing !== id);
	};

	// Die Fahrzeug-Felder liegen im selben <form> wie der eigentliche Absenden-Button —
	// ohne diesen Handler würde Enter in einem Feld das gesamte Formular abschicken statt nur
	// diese Karte in den Lese-Modus zu klappen (analog zu "Fertig" oben).
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

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-lg font-medium text-ink">Tatort</legend>

				<fieldset class="mt-2">
					<legend class="text-lg font-medium text-ink">Art der Zeitangabe</legend>
					<SegmentedControl
						name="timeMode-{vehicle.id}"
						value={vehicle.timeMode}
						onChange={(mode) =>
							mode === 'parkverstoss' ? selectParkverstoss() : selectHalteverstoss()}
						options={[
							{
								value: 'halteverstoss',
								label: 'Halteverstoß',
								ariaLabel: 'Halteverstoß (Einzelzeitpunkt)'
							},
							{
								value: 'parkverstoss',
								label: 'Parkverstoß',
								ariaLabel: 'Parkverstoß (Zeitraum, mind. 4 Min.)'
							}
						]}
					/>
					{#if vehicle.timeMode === 'parkverstoss'}
						<p class="mt-1 text-base text-ink-muted">
							Für die Ahndung eines Parkverstoßes muss das Fahrzeug mindestens 4 Minuten durchgängig
							geparkt gewesen sein.
						</p>
					{/if}
				</fieldset>

				<div
					class={`mt-2 grid grid-cols-1 gap-3 ${vehicle.timeMode === 'parkverstoss' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
				>
					<FormField
						id="date-{vehicle.id}"
						label="Datum"
						type="date"
						required
						error={errors?.date}
						bind:value={vehicle.date}
					/>
					<FormField
						id="time-{vehicle.id}"
						label={vehicle.timeMode === 'parkverstoss' ? 'Von' : 'Uhrzeit'}
						type="time"
						required
						error={errors?.time}
						bind:value={vehicle.time}
					/>
					{#if vehicle.timeMode === 'parkverstoss'}
						<FormField
							id="endTime-{vehicle.id}"
							label="Bis"
							type="time"
							required
							error={errors?.endTime}
							bind:value={vehicle.endTime}
						/>
					{/if}
				</div>
				<div class="mt-2 grid grid-cols-[2fr_1fr] gap-3">
					<AddressAutocomplete
						id="locationStreet-{vehicle.id}"
						label="Straße"
						required
						error={errors?.locationStreet}
						bind:value={vehicle.locationStreet}
						onSelect={(suggestion) => applyAddressSuggestion(vehicle, suggestion, true)}
					/>
					<FormField
						id="locationHouseNumber-{vehicle.id}"
						label="Hausnr."
						bind:value={vehicle.locationHouseNumber}
					/>
				</div>
				{#if geocodeWarning}<p role="status" class="mt-1 text-lg text-warning-fg">
						{geocodeWarning}
					</p>{/if}
				<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
					<FormField
						id="locationPostcode-{vehicle.id}"
						label="PLZ"
						required
						error={errors?.locationPostcode}
						bind:value={vehicle.locationPostcode}
					/>
					<FormField
						id="locationCity-{vehicle.id}"
						label="Ort"
						required
						error={errors?.locationCity}
						bind:value={vehicle.locationCity}
					/>
				</div>
			</fieldset>

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-lg font-medium text-ink">Fahrzeug</legend>

				<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
					<FormField
						id="licensePlateCountry-{vehicle.id}"
						label="Länderkennz."
						bind:value={vehicle.licensePlateCountry}
					/>
					<FormField
						id="licensePlate-{vehicle.id}"
						label="Kennzeichen"
						required
						error={errors?.licensePlate}
					>
						{#snippet control()}
							<input
								id="licensePlate-{vehicle.id}"
								value={vehicle.licensePlate}
								oninput={handleLicensePlateInput}
								onblur={handleLicensePlateBlur}
								required
								aria-required="true"
								autocapitalize="characters"
								{...ariaFieldProps(`licensePlate-${vehicle.id}`, errors?.licensePlate)}
								class={inputBase}
							/>
						{/snippet}
					</FormField>
				</div>

				<div class="mt-2">
					<FormField
						id="vehicleType-{vehicle.id}"
						label="Fahrzeugart"
						required
						error={errors?.vehicleType}
						wrapperClass=""
					>
						{#snippet control()}
							<select
								id="vehicleType-{vehicle.id}"
								bind:value={vehicle.vehicleType}
								required
								aria-required="true"
								{...ariaFieldProps(`vehicleType-${vehicle.id}`, errors?.vehicleType)}
								class={inputBase}
							>
								<option value="" disabled>Bitte wählen</option>
								{#each VEHICLE_TYPES as type (type)}<option value={type}>{type}</option>{/each}
							</select>
						{/snippet}
					</FormField>
				</div>

				<div class="mt-2 grid grid-cols-2 gap-3">
					<FormField
						id="make-{vehicle.id}"
						label="Marke"
						required
						error={errors?.make}
						list="vehicle-makes-{vehicle.id}"
						bind:value={vehicle.make}
					>
						{#snippet after()}
							<datalist id="vehicle-makes-{vehicle.id}">
								{#each VEHICLE_MAKES as make (make)}<option value={make}></option>{/each}
							</datalist>
						{/snippet}
					</FormField>
					<FormField
						id="color-{vehicle.id}"
						label="Farbe"
						required
						error={errors?.color}
						placeholder="z. B. Rot, hell, dunkel"
						bind:value={vehicle.color}
					/>
				</div>
				<p class="mt-1 text-base text-ink-muted">
					Genaue Farbe unbekannt? Auch Beschreibungen wie „hell" oder „dunkel" reichen aus.
				</p>
			</fieldset>

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
									<Icon class="size-5 shrink-0" />
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
						<textarea id="notes-{vehicle.id}" bind:value={vehicle.notes} class={inputBase}
						></textarea>
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

<ConfirmDialog
	bind:dialog={previewDialog}
	titleId="preview-dialog-title-{vehicle.id}"
	title={total > 1 ? `Vorschau: Fahrzeug ${index + 1} von ${total}` : 'Vorschau'}
	desktopMaxWidthClass="sm:max-w-2xl"
>
	{#if !previewEmail}
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
				<p class="text-ink">{previewEmail.subject}</p>
			</div>
			<div>
				<p class="text-base font-medium text-ink-muted">Nachricht</p>
				<pre
					class="mt-1 max-h-64 overflow-y-auto rounded-control border border-border bg-surface-sunken p-2 text-base whitespace-pre-wrap text-ink">{previewEmail.body}</pre>
			</div>
			{#if previewPhotos.length > 0}
				<div>
					<p class="text-base font-medium text-ink-muted">Anhang</p>
					<div class="mt-1 flex flex-wrap gap-2">
						{#each previewPhotos as photo, photoIndex (photo.id)}
							<img
								src={objectUrl(photo.blob)}
								alt="Beweisfoto {photoIndex + 1} von {previewPhotos.length}"
								class="max-h-48 w-auto max-w-full rounded-control border border-border object-contain"
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
	{#snippet actions()}
		<button type="button" onclick={() => previewDialog?.close()} class="flex-1 {buttonSecondary}">
			Schließen
		</button>
	{/snippet}
</ConfirmDialog>
