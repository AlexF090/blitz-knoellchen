<script lang="ts">
	import type { IncidentType } from '$lib/config/cities';
	import type { PhotoEntry, VehicleEntry, VehicleErrors } from '$lib/validation/formSchema';

	interface Props {
		vehicle: VehicleEntry;
		index: number;
		total: number;
		errors?: VehicleErrors;
		pool: PhotoEntry[];
		incidentTypes: IncidentType[];
		maxPhotos: number;
		onRemove: () => void;
	}

	let { vehicle, index, total, errors, pool, incidentTypes, maxPhotos, onRemove }: Props = $props();

	const objectUrl = (blob: Blob) => URL.createObjectURL(blob);

	const togglePhoto = (photoId: string) => {
		if (vehicle.photoIds.includes(photoId)) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
		} else if (vehicle.photoIds.length < maxPhotos) {
			vehicle.photoIds = [...vehicle.photoIds, photoId];
		}
	};

	const toggleIncidentType = (id: string, checked: boolean) => {
		vehicle.incidentTypeIds = checked
			? [...vehicle.incidentTypeIds, id]
			: vehicle.incidentTypeIds.filter((existing) => existing !== id);
	};
</script>

<div class="rounded-card border-l-4 border-primary-300 bg-surface p-4 shadow-card sm:p-6">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-ink">
			{total > 1 ? `Fahrzeug ${index + 1}` : 'Fahrzeug'}
		</h3>
		{#if total > 1}
			<button type="button" onclick={onRemove} class="text-sm text-error-fg underline">
				Entfernen
			</button>
		{/if}
	</div>

	<div class="mt-3">
		<p class="text-sm font-medium text-ink">
			Welche Fotos zeigen dieses Fahrzeug? (max. {maxPhotos})
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

	<div class="mt-3">
		<label for="licensePlate-{vehicle.id}" class="block text-sm font-medium text-ink"
			>Kennzeichen</label
		>
		<input
			id="licensePlate-{vehicle.id}"
			bind:value={vehicle.licensePlate}
			class="mt-1 w-full rounded-control border border-border p-2"
		/>
		{#if errors?.licensePlate}<p class="text-sm text-error-fg">{errors.licensePlate}</p>{/if}
	</div>

	<fieldset class="mt-3">
		<legend class="block text-sm font-medium text-ink"
			>Art des Verstoßes (Mehrfachauswahl möglich)</legend
		>
		<div class="mt-1 flex flex-col gap-2">
			{#each incidentTypes as type (type.id)}
				<label class="flex items-center gap-2 text-sm text-ink">
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
		{#if errors?.incidentTypeIds}<p class="text-sm text-error-fg">{errors.incidentTypeIds}</p>{/if}
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
