<script lang="ts">
	import { RotateCcw, Trash2 } from '@lucide/svelte';
	import type { IncidentType } from '$lib/config/cities';
	import { applyAddressSuggestion } from '$lib/geocode/applyAddressSuggestion';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { fade } from 'svelte/transition';
	import { ariaFieldProps } from '$lib/validation/ariaField';
	import { validateVehicle } from '$lib/validation/formSchema';
	import type { PhotoEntry, VehicleEntry, VehicleErrors } from '$lib/validation/formSchema';
	import { getVehicleAccentClass } from '$lib/config/vehicleColors';
	import { VEHICLE_MAKES } from '$lib/config/vehicleMakes';
	import { VEHICLE_TYPES } from '$lib/config/vehicleTypes';
	import { formatAddress } from '$lib/geocode/formatAddress';
	import { buttonDestructive, buttonPrimary, buttonSecondary } from '$lib/ui/buttonStyles';
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
		onRemove,
		onReset,
		onPhotoToggled
	}: Props = $props();

	let open = $state(true);
	let resetDialog = $state<HTMLDialogElement | undefined>(undefined);

	const openResetDialog = () => resetDialog?.showModal();

	const confirmReset = () => {
		resetDialog?.close();
		triggerHaptic('warning');
		if (total > 1) onRemove();
		else onReset();
	};

	const handleResetBackdropClick = (event: MouseEvent) => {
		if (event.target === resetDialog) resetDialog.close();
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
</script>

<div
	class="rounded-card border-l-4 {getVehicleAccentClass(index)} bg-surface p-4 shadow-card sm:p-6"
>
	<div class="flex items-center justify-between gap-2">
		<h3 class="text-sm font-semibold text-ink">
			{total > 1 ? `Fahrzeug/Vorfall ${index + 1}` : 'Fahrzeug/Vorfall'}
		</h3>
		<button
			type="button"
			onclick={openResetDialog}
			aria-label={total > 1 ? 'Fahrzeug/Vorfall entfernen' : 'Fahrzeug/Vorfall zurücksetzen'}
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

		<div class="mt-3 rounded-control border border-border p-3">
			<p class="text-sm font-medium text-ink">Tatort</p>

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
		</div>

		<div class="mt-3 grid grid-cols-[1fr_2fr] gap-3">
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
					bind:value={vehicle.licensePlate}
					required
					aria-required="true"
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

		<div class="mt-3">
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

		<div class="mt-3 grid grid-cols-2 gap-3">
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

		<fieldset class="mt-3">
			<legend class="block text-sm font-medium text-ink"
				>Art des Verstoßes (Mehrfachauswahl möglich) <span class="text-error-fg">*</span></legend
			>
			<div class="mt-1 flex flex-col gap-2">
				{#each incidentTypes as type (type.id)}
					<label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
						<input
							type="checkbox"
							checked={vehicle.incidentTypeIds.includes(type.id)}
							onchange={(e) => toggleIncidentType(type.id, e.currentTarget.checked)}
							class="size-4 rounded border-border"
						/>
						{type.label}
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
	{/if}

	<div class="mt-4">
		{#if open}
			<button
				type="button"
				onclick={() => isComplete() && (open = false)}
				disabled={!isComplete()}
				class="flex w-full items-center justify-center gap-1 {buttonPrimary} disabled:cursor-not-allowed disabled:bg-border disabled:text-ink-muted"
				aria-expanded={open}
			>
				Fertig
			</button>
			{#if !isComplete()}
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
		{:else}
			<button
				type="button"
				onclick={() => (open = true)}
				class="flex w-full items-center justify-center gap-1 {buttonSecondary}"
				aria-expanded={open}
			>
				Bearbeiten
			</button>
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
