<script lang="ts">
	import { RotateCcw, Trash2 } from '@lucide/svelte';
	import type { IncidentType } from '$lib/config/cities';
	import { validateVehicle } from '$lib/validation/formSchema';
	import type { PhotoEntry, VehicleEntry, VehicleErrors } from '$lib/validation/formSchema';
	import { getVehicleAccentClass } from '$lib/config/vehicleColors';
	import { formatAddress } from '$lib/geocode/formatAddress';

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
	let resetDialog: HTMLDialogElement | undefined;

	const openResetDialog = () => resetDialog?.showModal();

	const confirmReset = () => {
		resetDialog?.close();
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
			class="flex h-9 w-9 items-center justify-center rounded-full text-error-fg hover:bg-error-fg/10"
		>
			{#if total > 1}
				<Trash2 class="h-5 w-5" aria-hidden="true" />
			{:else}
				<RotateCcw class="h-5 w-5" aria-hidden="true" />
			{/if}
		</button>
	</div>

	{#if !open}
		<dl class="mt-3 flex flex-col gap-3 text-sm">
			<div>
				<dt class="text-xs font-medium text-ink-muted">Fotos</dt>
				{#if vehicle.photoIds.length > 0}
					<dd class="mt-1 flex flex-wrap gap-2">
						{#each vehicle.photoIds as photoId (photoId)}
							{@const photo = pool.find((p) => p.id === photoId)}
							{#if photo}
								<img
									src={objectUrl(photo.blob)}
									alt="Foto {photo.fileName}"
									class="h-14 w-14 rounded-control border border-border object-cover"
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
				<dt class="text-xs font-medium text-ink-muted">Tatort</dt>
				<dd class="text-ink">{summaryAddress() || '—'}</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-ink-muted">Datum / Uhrzeit</dt>
				<dd class="text-ink">
					{vehicle.date && vehicle.time
						? `${formatDateDMY(vehicle.date)}, ${vehicle.time} Uhr`
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
			<p class="mt-2 text-sm text-error-fg">Angaben unvollständig</p>
		{/if}
	{/if}

	{#if open}
		<div class="mt-3">
			<p class="text-sm font-medium text-ink">
				Welche Fotos zeigen dieses Fahrzeug? (max. {maxPhotos})
				<span class="text-error-fg">*</span>
			</p>
			{#if pool.length === 0}
				<p class="mt-1 text-sm text-ink-muted">Zuerst oben ein Foto hinzufügen.</p>
			{:else}
				<div class="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-6">
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
			<div class="mt-2 grid grid-cols-2 gap-3">
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
						class="mt-1 w-full min-w-0 rounded-control border border-border p-2"
					/>
					{#if errors?.date}<p class="text-sm text-error-fg">{errors.date}</p>{/if}
				</div>
				<div class="min-w-0">
					<label for="time-{vehicle.id}" class="block text-sm font-medium text-ink"
						>Uhrzeit <span class="text-error-fg">*</span></label
					>
					<input
						id="time-{vehicle.id}"
						type="time"
						bind:value={vehicle.time}
						required
						aria-required="true"
						class="mt-1 w-full min-w-0 rounded-control border border-border p-2"
					/>
					{#if errors?.time}<p class="text-sm text-error-fg">{errors.time}</p>{/if}
				</div>
			</div>
			<div class="mt-2 grid grid-cols-[2fr_1fr] gap-3">
				<div class="min-w-0">
					<label for="locationStreet-{vehicle.id}" class="block text-sm font-medium text-ink"
						>Straße <span class="text-error-fg">*</span></label
					>
					<input
						id="locationStreet-{vehicle.id}"
						bind:value={vehicle.locationStreet}
						required
						aria-required="true"
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors?.locationStreet}<p class="text-sm text-error-fg">
							{errors.locationStreet}
						</p>{/if}
				</div>
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
			{#if geocodeWarning}<p class="mt-1 text-sm text-warning-fg">{geocodeWarning}</p>{/if}
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
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors?.locationPostcode}<p class="text-sm text-error-fg">
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
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors?.locationCity}<p class="text-sm text-error-fg">{errors.locationCity}</p>{/if}
				</div>
			</div>
		</div>

		<div class="mt-3">
			<label for="licensePlate-{vehicle.id}" class="block text-sm font-medium text-ink"
				>Kennzeichen <span class="text-error-fg">*</span></label
			>
			<input
				id="licensePlate-{vehicle.id}"
				bind:value={vehicle.licensePlate}
				required
				aria-required="true"
				class="mt-1 w-full rounded-control border border-border p-2"
			/>
			{#if errors?.licensePlate}<p class="text-sm text-error-fg">{errors.licensePlate}</p>{/if}
		</div>

		<fieldset class="mt-3">
			<legend class="block text-sm font-medium text-ink"
				>Art des Verstoßes (Mehrfachauswahl möglich) <span class="text-error-fg">*</span></legend
			>
			<div class="mt-1 flex flex-col gap-2">
				{#each incidentTypes as type (type.id)}
					<label class="flex cursor-pointer items-center gap-2 text-sm text-ink">
						<input
							type="checkbox"
							checked={vehicle.incidentTypeIds.includes(type.id)}
							onchange={(e) => toggleIncidentType(type.id, e.currentTarget.checked)}
							class="h-4 w-4 rounded border-border"
						/>
						{type.label}
					</label>
				{/each}
			</div>
			{#if errors?.incidentTypeIds}<p class="text-sm text-error-fg">
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
				class="flex w-full items-center justify-center gap-1 rounded-control bg-primary-500 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-border disabled:text-ink-muted"
				aria-expanded={open}
			>
				Fertig
			</button>
			{#if !isComplete()}
				<div class="mt-1 text-xs text-ink-muted">
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
				class="flex w-full items-center justify-center gap-1 rounded-control border border-primary-500 py-2.5 text-sm font-semibold text-primary-600"
				aria-expanded={open}
			>
				Bearbeiten
			</button>
		{/if}
	</div>
</div>

<dialog
	bind:this={resetDialog}
	onclick={handleResetBackdropClick}
	class="m-auto w-[90vw] max-w-sm rounded-card bg-surface p-4 shadow-card backdrop:bg-ink/70 sm:p-6"
>
	<h3 class="text-sm font-semibold text-ink">
		{total > 1 ? 'Fahrzeug/Vorgang entfernen?' : 'Fahrzeug/Vorgang zurücksetzen?'}
	</h3>
	<p class="mt-1 text-sm text-ink-muted">
		{total > 1
			? 'Dieser Datensatz wird unwiderruflich aus der Anzeige entfernt.'
			: 'Die bereits eingetragenen Daten werden unwiderruflich gelöscht.'}
	</p>

	<dl class="mt-3 flex flex-col gap-2 text-sm">
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
		{#if summaryAddress()}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Tatort</dt>
				<dd class="text-ink">{summaryAddress()}</dd>
			</div>
		{/if}
		{#if vehicle.date && vehicle.time}
			<div>
				<dt class="text-xs font-medium text-ink-muted">Datum / Uhrzeit</dt>
				<dd class="text-ink">{formatDateDMY(vehicle.date)}, {vehicle.time} Uhr</dd>
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

	<div class="mt-4 flex gap-2">
		<button
			type="button"
			onclick={() => resetDialog?.close()}
			class="flex-1 rounded-control border border-primary-500 py-2.5 text-sm font-semibold text-primary-600"
		>
			Abbrechen
		</button>
		<button
			type="button"
			onclick={confirmReset}
			class="flex-1 rounded-control bg-error-fg py-2.5 text-sm font-semibold text-white"
		>
			Entfernen
		</button>
	</div>
</dialog>
