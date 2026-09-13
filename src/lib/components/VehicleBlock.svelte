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
	import { formatAddress } from '$lib/geocode/formatAddress';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { buttonDestructive, buttonPrimary, buttonSecondary } from '$lib/ui/buttonStyles';
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
	const openPreviewDialog = () => isComplete() && previewDialog?.showModal();

	const handlePreviewBackdropClick = (event: MouseEvent) => {
		if (event.target === previewDialog) previewDialog.close();
	};

	const previewPhotos = $derived(
		vehicle.photoIds
			.map((id) => pool.find((p) => p.id === id))
			.filter((photo): photo is PhotoEntry => photo !== undefined)
	);

	const previewEmail = $derived.by(() => {
		if (!isComplete()) return null;
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

	const handleResetBackdropClick = (event: MouseEvent) => {
		if (event.target === resetDialog) resetDialog.close();
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

	const summaryAddress = () =>
		vehicle.locationStreet
			? formatAddress({
					street: vehicle.locationStreet,
					houseNumber: vehicle.locationHouseNumber,
					postcode: vehicle.locationPostcode,
					city: vehicle.locationCity
				})
			: '';

	const formatDateDMY = (isoDate: string) => {
		const [year, month, day] = isoDate.split('-');
		return `${day}.${month}.${year}`;
	};

	const formatTimeRange = (v: VehicleEntry) => (v.endTime ? `${v.time}–${v.endTime}` : v.time);

	const selectHalteverstoss = () => {
		vehicle.timeMode = 'halteverstoss';
		vehicle.endTime = '';
		triggerHaptic('selection');
	};
	const selectParkverstoss = () => {
		vehicle.timeMode = 'parkverstoss';
		triggerHaptic('selection');
	};

	const summaryIncidentTypes = () =>
		incidentTypes
			.filter((type) => vehicle.incidentTypeIds.includes(type.id))
			.map((type) => type.label)
			.join(', ');

	const missingFieldMessages = () => Object.values(validateVehicle(vehicle, pool));

	const isComplete = () => missingFieldMessages().length === 0;

	// Falls sich Angaben nachträglich als unvollständig herausstellen (z.B. ein Foto wird
	// andernorts aus dem Pool entfernt), zwingt das die zugeklappte Karte wieder auf, statt
	// unvollständige Angaben unsichtbar zu lassen.
	$effect(() => {
		if (!isComplete() && !open) open = true;
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
	const onVehicleFieldKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (isComplete()) open = false;
	};
</script>

<div
	class="rounded-card border-l-4 {getVehicleAccentClass(index)} bg-surface p-4 shadow-card sm:p-6"
>
	<div class="flex items-center justify-between gap-2">
		<div>
			<h3 class="text-sm font-semibold text-ink">
				{total > 1 ? `Vorfall ${index + 1}` : 'Vorfall'}
			</h3>
			<p class="text-xs text-ink-muted">Betrifft ein Fahrzeug</p>
		</div>
		<button
			type="button"
			onclick={openResetDialog}
			aria-label={total > 1 ? 'Vorfall entfernen' : 'Vorfall zurücksetzen'}
			title={total > 1 ? 'Entfernen' : 'Zurücksetzen'}
			class="flex size-10 items-center justify-center rounded-full text-error-fg hover:bg-error-fg/10"
		>
			{#if total > 1}
				<Trash2 class="size-5" aria-hidden="true" />
			{:else}
				<RotateCcw class="size-5" aria-hidden="true" />
			{/if}
		</button>
	</div>

	{#if !open}
		<dl
			transition:fade={{ duration: transitionDuration(150) }}
			class="mt-3 flex flex-col gap-3 text-sm"
		>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Fotos</dt>
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
			<div>
				<dt class="text-xs font-medium text-ink-muted">Kennzeichen</dt>
				<dd class="text-ink">{vehicle.licensePlate || '—'}</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Fahrzeug</dt>
				<dd class="text-ink">
					{vehicle.vehicleType || '—'} · {vehicle.make} · {vehicle.color || '—'}
				</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Tatort</dt>
				<dd class="text-ink">{summaryAddress() || '—'}</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Datum / Uhrzeit</dt>
				<dd class="text-ink">
					{vehicle.date && vehicle.time
						? `${formatDateDMY(vehicle.date)}, ${formatTimeRange(vehicle)} Uhr`
						: '—'}
				</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Art des Verstoßes</dt>
				<dd class="text-ink">{summaryIncidentTypes() || '—'}</dd>
			</div>
			{#if vehicle.notes}
				<div>
					<dt class="text-xs font-medium text-ink-muted">Weitere Angaben</dt>
					<dd class="text-ink">{vehicle.notes}</dd>
				</div>
			{/if}
		</dl>
		{#if errors}
			<p role="alert" class="mt-2 text-sm text-error-fg">Angaben unvollständig</p>
		{/if}
	{/if}

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div onkeydown={onVehicleFieldKeydown}>
			<div class="mt-3">
				<p class="text-sm font-medium text-ink">
					Fotos mit diesem Fahrzeug
					<span class="whitespace-nowrap">
						(max. {maxPhotos}) <span class="text-error-fg">*</span>
					</span>
				</p>
				{#if pool.length === 0}
					<p class="mt-1 text-sm text-ink-muted">Zuerst oben ein Foto hinzufügen.</p>
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
									class="h-full w-full object-cover"
								/>
								{#if selected}
									<span
										aria-hidden="true"
										class="absolute inset-0 flex items-center justify-center bg-primary-600/40 text-white"
										>✓</span
									>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				{#if errors?.photoIds}<p role="alert" class="mt-1 text-sm text-error-fg">
						{errors.photoIds}
					</p>{/if}
			</div>

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-sm font-medium text-ink">Tatort</legend>

				<fieldset class="mt-2">
					<legend class="text-sm font-medium text-ink">Art der Zeitangabe</legend>
					<div class="mt-1 inline-flex w-full rounded-control bg-surface-sunken p-1">
						<label
							class="relative flex-1 cursor-pointer rounded-[calc(var(--radius-control)-0.25rem)] px-3
							py-1.5 text-center text-sm font-medium text-ink-muted transition-colors
							has-checked:bg-surface has-checked:text-primary-600 has-checked:shadow-card"
						>
							<input
								type="radio"
								name="timeMode-{vehicle.id}"
								aria-label="Halteverstoß (Einzelzeitpunkt)"
								checked={vehicle.timeMode !== 'parkverstoss'}
								onchange={selectHalteverstoss}
								class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
							/>
							Halteverstoß
						</label>
						<label
							class="relative flex-1 cursor-pointer rounded-[calc(var(--radius-control)-0.25rem)] px-3
							py-1.5 text-center text-sm font-medium text-ink-muted transition-colors
							has-checked:bg-surface has-checked:text-primary-600 has-checked:shadow-card"
						>
							<input
								type="radio"
								name="timeMode-{vehicle.id}"
								aria-label="Parkverstoß (Zeitraum, mind. 4 Min.)"
								checked={vehicle.timeMode === 'parkverstoss'}
								onchange={selectParkverstoss}
								class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
							/>
							Parkverstoß
						</label>
					</div>
					{#if vehicle.timeMode === 'parkverstoss'}
						<p class="mt-1 text-xs text-ink-muted">
							Für die Ahndung eines Parkverstoßes muss das Fahrzeug mindestens 4 Minuten durchgängig
							geparkt gewesen sein.
						</p>
					{/if}
				</fieldset>

				<div
					class={`mt-2 grid grid-cols-1 gap-3 ${vehicle.timeMode === 'parkverstoss' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
				>
					<div class="min-w-0">
						<label for="date-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Datum <span class="text-error-fg">*</span></label
						>
						<input
							id="date-{vehicle.id}"
							type="date"
							bind:value={vehicle.date}
							required
							aria-required="true"
							{...ariaFieldProps(`date-${vehicle.id}`, errors?.date)}
							class="mt-1 w-full min-w-0 rounded-control border border-border p-2"
						/>
						{#if errors?.date}<p
								id="date-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.date}
							</p>{/if}
					</div>
					<div class="min-w-0">
						<label for="time-{vehicle.id}" class="block text-sm font-medium text-ink"
							>{vehicle.timeMode === 'parkverstoss' ? 'Von' : 'Uhrzeit'}
							<span class="text-error-fg">*</span></label
						>
						<input
							id="time-{vehicle.id}"
							type="time"
							bind:value={vehicle.time}
							required
							aria-required="true"
							{...ariaFieldProps(`time-${vehicle.id}`, errors?.time)}
							class="mt-1 w-full min-w-0 rounded-control border border-border p-2"
						/>
						{#if errors?.time}<p
								id="time-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.time}
							</p>{/if}
					</div>
					{#if vehicle.timeMode === 'parkverstoss'}
						<div class="min-w-0">
							<label for="endTime-{vehicle.id}" class="block text-sm font-medium text-ink"
								>Bis <span class="text-error-fg">*</span></label
							>
							<input
								id="endTime-{vehicle.id}"
								type="time"
								bind:value={vehicle.endTime}
								required
								aria-required="true"
								{...ariaFieldProps(`endTime-${vehicle.id}`, errors?.endTime)}
								class="mt-1 w-full min-w-0 rounded-control border border-border p-2"
							/>
							{#if errors?.endTime}<p
									id="endTime-{vehicle.id}-error"
									role="alert"
									class="text-sm text-error-fg"
								>
									{errors.endTime}
								</p>{/if}
						</div>
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
					<div class="min-w-0">
						<label for="locationHouseNumber-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Hausnr.</label
						>
						<input
							id="locationHouseNumber-{vehicle.id}"
							bind:value={vehicle.locationHouseNumber}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
					</div>
				</div>
				{#if geocodeWarning}<p role="status" class="mt-1 text-sm text-warning-fg">
						{geocodeWarning}
					</p>{/if}
				<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
					<div class="min-w-0">
						<label for="locationPostcode-{vehicle.id}" class="block text-sm font-medium text-ink"
							>PLZ <span class="text-error-fg">*</span></label
						>
						<input
							id="locationPostcode-{vehicle.id}"
							bind:value={vehicle.locationPostcode}
							required
							aria-required="true"
							{...ariaFieldProps(`locationPostcode-${vehicle.id}`, errors?.locationPostcode)}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors?.locationPostcode}<p
								id="locationPostcode-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.locationPostcode}
							</p>{/if}
					</div>
					<div class="min-w-0">
						<label for="locationCity-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Ort <span class="text-error-fg">*</span></label
						>
						<input
							id="locationCity-{vehicle.id}"
							bind:value={vehicle.locationCity}
							required
							aria-required="true"
							{...ariaFieldProps(`locationCity-${vehicle.id}`, errors?.locationCity)}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors?.locationCity}<p
								id="locationCity-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.locationCity}
							</p>{/if}
					</div>
				</div>
			</fieldset>

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-sm font-medium text-ink">Fahrzeug</legend>

				<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
					<div class="min-w-0">
						<label for="licensePlateCountry-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Länderkennz.</label
						>
						<input
							id="licensePlateCountry-{vehicle.id}"
							bind:value={vehicle.licensePlateCountry}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
					</div>
					<div class="min-w-0">
						<label for="licensePlate-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Kennzeichen <span class="text-error-fg">*</span></label
						>
						<input
							id="licensePlate-{vehicle.id}"
							value={vehicle.licensePlate}
							oninput={handleLicensePlateInput}
							onblur={handleLicensePlateBlur}
							required
							aria-required="true"
							autocapitalize="characters"
							{...ariaFieldProps(`licensePlate-${vehicle.id}`, errors?.licensePlate)}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors?.licensePlate}<p
								id="licensePlate-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.licensePlate}
							</p>{/if}
					</div>
				</div>

				<div class="mt-2">
					<label for="vehicleType-{vehicle.id}" class="block text-sm font-medium text-ink"
						>Fahrzeugart <span class="text-error-fg">*</span></label
					>
					<select
						id="vehicleType-{vehicle.id}"
						bind:value={vehicle.vehicleType}
						required
						aria-required="true"
						{...ariaFieldProps(`vehicleType-${vehicle.id}`, errors?.vehicleType)}
						class="mt-1 w-full rounded-control border border-border p-2"
					>
						<option value="" disabled>Bitte wählen</option>
						{#each VEHICLE_TYPES as type (type)}<option value={type}>{type}</option>{/each}
					</select>
					{#if errors?.vehicleType}<p
							id="vehicleType-{vehicle.id}-error"
							role="alert"
							class="text-sm text-error-fg"
						>
							{errors.vehicleType}
						</p>{/if}
				</div>

				<div class="mt-2 grid grid-cols-2 gap-3">
					<div class="min-w-0">
						<label for="make-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Marke <span class="text-error-fg">*</span></label
						>
						<input
							id="make-{vehicle.id}"
							list="vehicle-makes-{vehicle.id}"
							bind:value={vehicle.make}
							required
							aria-required="true"
							{...ariaFieldProps(`make-${vehicle.id}`, errors?.make)}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						<datalist id="vehicle-makes-{vehicle.id}">
							{#each VEHICLE_MAKES as make (make)}<option value={make}></option>{/each}
						</datalist>
						{#if errors?.make}<p
								id="make-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.make}
							</p>{/if}
					</div>
					<div class="min-w-0">
						<label for="color-{vehicle.id}" class="block text-sm font-medium text-ink"
							>Farbe <span class="text-error-fg">*</span></label
						>
						<input
							id="color-{vehicle.id}"
							placeholder="z. B. Rot, hell, dunkel"
							bind:value={vehicle.color}
							required
							aria-required="true"
							{...ariaFieldProps(`color-${vehicle.id}`, errors?.color)}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors?.color}<p
								id="color-{vehicle.id}-error"
								role="alert"
								class="text-sm text-error-fg"
							>
								{errors.color}
							</p>{/if}
					</div>
				</div>
				<p class="mt-1 text-xs text-ink-muted">
					Genaue Farbe unbekannt? Auch Beschreibungen wie „hell" oder „dunkel" reichen aus.
				</p>
			</fieldset>

			<fieldset class="mt-3 rounded-control border border-border p-3">
				<legend class="px-1 text-sm font-medium text-ink">Verstöße</legend>
				<p class="text-xs text-ink-muted">
					Art des Verstoßes (Mehrfachauswahl möglich) <span class="text-error-fg">*</span>
				</p>
				<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each incidentTypes as type (type.id)}
						{@const Icon = INCIDENT_TYPE_ICONS[type.id]}
						<label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
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
				{#if errors?.incidentTypeIds}<p role="alert" class="text-sm text-error-fg">
						{errors.incidentTypeIds}
					</p>{/if}
			</fieldset>

			<div class="mt-3">
				<label for="notes-{vehicle.id}" class="block text-sm font-medium text-ink"
					>Weitere Angaben (optional)</label
				>
				<textarea
					id="notes-{vehicle.id}"
					bind:value={vehicle.notes}
					class="mt-1 w-full rounded-control border border-border p-2"></textarea>
			</div>
		</div>
	{/if}

	<div class="mt-4">
		<div class="flex items-center gap-6">
			<button
				type="button"
				onclick={openPreviewDialog}
				disabled={!isComplete()}
				title={isComplete()
					? undefined
					: 'Erst verfügbar, wenn alle Pflichtfelder ausgefüllt sind.'}
				class="flex flex-1 items-center justify-center gap-1 {buttonSecondary} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Eye class="size-4" aria-hidden="true" />
				E-Mail-Vorschau
			</button>
			{#if open}
				<button
					type="button"
					onclick={() => isComplete() && (open = false)}
					disabled={!isComplete()}
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
		{#if open && !isComplete()}
			<div
				role="status"
				transition:fade={{ duration: transitionDuration(150) }}
				class="mt-1 text-xs text-ink-muted"
			>
				<p>Noch nicht einklappbar, bitte prüfen:</p>
				<ul class="mt-1 list-disc pl-5">
					{#each missingFieldMessages() as message (message)}
						<li>{message}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

<ConfirmDialog
	bind:dialog={resetDialog}
	onBackdropClick={handleResetBackdropClick}
	titleId="reset-dialog-title-{vehicle.id}"
	title={total > 1 ? 'Fahrzeug/Vorgang entfernen?' : 'Fahrzeug/Vorgang zurücksetzen?'}
>
	<p class="mt-1 text-sm text-ink-muted">
		{total > 1
			? 'Dieser Datensatz wird unwiderruflich aus der Anzeige entfernt.'
			: 'Die bereits eingetragenen Daten werden unwiderruflich gelöscht.'}
	</p>

	<dl class="mt-3 flex flex-col gap-3 text-sm">
		{#if vehicle.photoIds.length > 0}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Foto Auswahl</dt>
				<dd class="text-ink">{vehicle.photoIds.length}</dd>
			</div>
		{/if}
		{#if vehicle.licensePlate}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Kennzeichen</dt>
				<dd class="text-ink">{vehicle.licensePlate}</dd>
			</div>
		{/if}
		{#if vehicle.color}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Fahrzeug</dt>
				<dd class="text-ink">
					{vehicle.vehicleType ? `${vehicle.vehicleType} · ` : ''}{vehicle.make} ·
					{vehicle.color}
				</dd>
			</div>
		{/if}
		{#if summaryAddress()}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Tatort</dt>
				<dd class="text-ink">{summaryAddress()}</dd>
			</div>
		{/if}
		{#if vehicle.date && vehicle.time}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Datum / Uhrzeit</dt>
				<dd class="text-ink">{formatDateDMY(vehicle.date)}, {formatTimeRange(vehicle)} Uhr</dd>
			</div>
		{/if}
		{#if summaryIncidentTypes()}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Art des Verstoßes</dt>
				<dd class="text-ink">{summaryIncidentTypes()}</dd>
			</div>
		{/if}
		{#if vehicle.notes}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Weitere Angaben</dt>
				<dd class="text-ink">{vehicle.notes}</dd>
			</div>
		{/if}
	</dl>
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
	onBackdropClick={handlePreviewBackdropClick}
	titleId="preview-dialog-title-{vehicle.id}"
	title={total > 1 ? `Vorschau: Fahrzeug ${index + 1} von ${total}` : 'Vorschau der E-Mail'}
	desktopMaxWidthClass="sm:max-w-2xl"
>
	{#if !previewEmail}
		<p class="mt-1 text-sm text-ink-muted">Noch nicht einklappbar, bitte prüfen:</p>
		<ul class="mt-1 list-disc pl-5 text-sm text-ink-muted">
			{#each missingFieldMessages() as message (message)}
				<li>{message}</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-3 flex flex-col gap-3 text-sm">
			<div>
				<p class="text-xs font-medium text-ink-muted">An</p>
				<p class="text-ink">{recipientEmail}</p>
			</div>
			<p class="text-xs text-ink-muted">
				Eine Kopie geht zusätzlich an deine eigene Adresse ({profile.email}) — als Antwort-Adresse
				und BCC.
			</p>
			<div>
				<p class="text-xs font-medium text-ink-muted">Betreff</p>
				<p class="text-ink">{previewEmail.subject}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-ink-muted">Nachricht</p>
				<pre
					class="mt-1 max-h-64 overflow-y-auto rounded-control border border-border bg-surface-sunken p-2 text-xs whitespace-pre-wrap text-ink">{previewEmail.body}</pre>
			</div>
			{#if previewPhotos.length > 0}
				<div>
					<p class="text-xs font-medium text-ink-muted">Anhang</p>
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
