<script lang="ts">
	/**
	 * Der gemeinsame Foto-Pool der Anzeige: Auswahl neuer Dateien, Vorschau-Grid und Lightbox.
	 * Die Zuordnung einzelner Fotos zu Fahrzeugen passiert nicht hier, sondern in VehicleBlock.
	 */
	import { MAX_PHOTOS_PER_BATCH, type PhotoEntry } from '$lib/validation/formSchema';
	import PhotoLightbox from './PhotoLightbox.svelte';

	interface Props {
		photos: PhotoEntry[];
		/** Wie oft ein Foto Fahrzeugen zugeordnet ist — ab 2 erscheint ein Zähler-Badge. */
		usageCounts?: Record<string, number>;
		/** Validierungsfehler des Pools (z.B. „mindestens ein Foto nötig“). */
		error?: string | null;
		/** Fehler beim Verarbeiten einer einzelnen Datei, z.B. gescheiterte HEIC-Konvertierung. */
		processingError?: string | null;
		/** Zeigt statt des Add-Felds einen Platzhalter mit Spinner. */
		processing?: boolean;
		/** Gesamtlimit über alle Fahrzeuge hinweg. */
		maxPhotos: number;
		maxPhotosPerVehicle: number;
		onAdd: (file: File) => void | Promise<void>;
		onRemove: (photoId: string) => void;
	}

	let {
		photos,
		usageCounts = {},
		error = null,
		processingError = null,
		processing = false,
		maxPhotos,
		maxPhotosPerVehicle,
		onAdd,
		onRemove
	}: Props = $props();

	let fileInput: HTMLInputElement | undefined;
	let lightboxPhoto: PhotoEntry | null = $state(null);
	let batchError = $state<string | null>(null);

	/** Macht einen Foto-Blob als `src` verwendbar. */
	const objectUrl = (blob: Blob) => URL.createObjectURL(blob);

	/** Übernimmt die ausgewählten Dateien der Reihe nach, begrenzt auf die freien Plätze. */
	const onFileSelected = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		// Leeren, damit dieselbe Datei direkt danach erneut ausgewählt werden kann.
		input.value = '';
		if (files.length === 0) return;

		// Das sichtbare Label verschwindet ab maxPhotos, das versteckte File-Input bleibt aber im
		// DOM bedienbar (Tastatur/AT) — deshalb hier zusätzlich auf das Gesamtlimit clampen, nicht
		// nur auf MAX_PHOTOS_PER_BATCH.
		const remainingSlots = Math.max(0, maxPhotos - photos.length);
		const allowedCount = Math.min(MAX_PHOTOS_PER_BATCH, remainingSlots);

		batchError =
			files.length > MAX_PHOTOS_PER_BATCH
				? `Es können maximal ${MAX_PHOTOS_PER_BATCH} Fotos gleichzeitig hinzugefügt werden.`
				: allowedCount < files.length
					? `Das Gesamtlimit von ${maxPhotos} Fotos ist bereits erreicht.`
					: null;

		for (const file of files.slice(0, allowedCount)) {
			await onAdd(file);
		}
	};
</script>

<div
	class="rounded-card bg-surface p-4 shadow-card sm:p-6"
	class:border-2={error}
	class:border-error-fg={error}
>
	<h2 class="text-lg font-semibold text-ink md:text-xl">Beweisfotos *</h2>
	<p class="text-lg text-ink-muted">
		Mindestens ein Foto ist erforderlich. Pro Fahrzeug können maximal {maxPhotosPerVehicle} Fotos ausgewählt
		werden.
	</p>

	<div class="mt-3 grid grid-cols-3 gap-2">
		{#each photos as photo (photo.id)}
			<div class="relative aspect-square">
				<button
					type="button"
					onclick={() => (lightboxPhoto = photo)}
					aria-label="Foto {photo.fileName} vergrößern"
					class="group block size-full overflow-hidden rounded-control border border-border"
				>
					<img src={objectUrl(photo.blob)} alt="" class="size-full object-cover" />
					<span
						class="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-opacity group-hover:bg-ink/20 group-hover:opacity-100 pointer-coarse:bg-ink/20 pointer-coarse:opacity-100"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="size-6 text-on-primary"
							aria-hidden="true"
						>
							<path
								d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7Z"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</span>
				</button>
				{#if usageCounts[photo.id] > 1}
					<span
						aria-label="Verwendet bei {usageCounts[photo.id]} Fahrzeugen"
						class="absolute top-1 left-1 rounded-full bg-primary-button px-1.5 py-0.5 text-xs text-on-primary"
					>
						<span aria-hidden="true">{usageCounts[photo.id]}×</span>
					</span>
				{/if}
				<button
					type="button"
					onclick={() => onRemove(photo.id)}
					aria-label="Foto {photo.fileName} entfernen"
					class="absolute -top-1 -right-1 flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-card"
				>
					×
				</button>
			</div>
		{/each}

		{#if processing}
			<div
				class="relative flex aspect-square items-center justify-center overflow-hidden rounded-control border border-border bg-surface-sunken"
				role="status"
				aria-label="Foto wird verarbeitet…"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					class="size-6 animate-spin text-ink-muted motion-reduce:animate-none"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
					<path
						d="M22 12a10 10 0 0 0-10-10"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
					/>
				</svg>
			</div>
		{/if}

		{#if photos.length < maxPhotos && !processing}
			<label
				for="photo-pool-input"
				class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-border text-base text-ink-muted"
			>
				<span class="text-xl">+</span>
				Foto
			</label>
		{/if}
	</div>

	<input
		bind:this={fileInput}
		id="photo-pool-input"
		type="file"
		accept="image/*"
		multiple
		onchange={onFileSelected}
		class="sr-only"
	/>

	{#if batchError}<p role="alert" class="mt-2 text-lg text-error-fg">{batchError}</p>{/if}
	{#if processingError}<p role="alert" class="mt-2 text-lg text-error-fg">
			{processingError}
		</p>{/if}
	{#if error}<p role="alert" class="mt-2 text-lg text-error-fg">{error}</p>{/if}
</div>

<PhotoLightbox photo={lightboxPhoto} onClose={() => (lightboxPhoto = null)} />
