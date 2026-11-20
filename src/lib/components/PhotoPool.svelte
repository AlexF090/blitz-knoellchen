<script lang="ts">
	/**
	 * Der gemeinsame Foto-Pool der Anzeige: Auswahl neuer Dateien, Vorschau-Grid und Lightbox.
	 * Die Zuordnung einzelner Fotos zu Fahrzeugen passiert nicht hier, sondern in VehicleBlock.
	 */
	import { blobSrc } from '#lib/photo/blobSrc.ts';
	import type { PhotoQueueProgress } from '#lib/photo/processPhotoQueue.ts';
	import type { PhotoEntry } from '#lib/validation/formSchema.ts';
	import PhotoLightbox from './PhotoLightbox.svelte';

	interface Props {
		photos: PhotoEntry[];
		/** Wie oft ein Foto Fahrzeugen zugeordnet ist — bei 0 „nicht zugeordnet“, ab 2 ein Zähler. */
		usageCounts?: Record<string, number>;
		/** Validierungsfehler des Pools (z.B. „mindestens ein Foto nötig“). */
		error?: string | null;
		/** Fehler beim Verarbeiten einzelner Dateien, z.B. gescheiterte HEIC-Konvertierung. */
		processingError?: string | null;
		/** Fortschritt der laufenden Verarbeitung; `null`, wenn gerade nichts verarbeitet wird. */
		progress?: PhotoQueueProgress | null;
		maxPhotosPerVehicle: number;
		/** Meldet alle auf einmal ausgewählten Dateien. */
		onAddFiles: (files: File[]) => void | Promise<void>;
		onRemove: (photoId: string) => void;
	}

	let {
		photos,
		usageCounts = {},
		error = null,
		processingError = null,
		progress = null,
		maxPhotosPerVehicle,
		onAddFiles,
		onRemove
	}: Props = $props();

	let fileInput: HTMLInputElement | undefined;
	let lightboxPhoto: PhotoEntry | null = $state(null);

	const progressText = $derived(
		progress ? `Foto ${progress.current} von ${progress.total} wird verarbeitet …` : ''
	);

	const photoCountLabel = (count: number) => (count === 1 ? '1 Foto' : `${count} Fotos`);

	/**
	 * Ansage für Bildschirmleser: nur Start und Ende der Verarbeitung, nicht jedes einzelne Foto.
	 * Die Live-Region bleibt dauerhaft eingehängt, weil Änderungen an einer neu eingefügten Region
	 * nicht zuverlässig vorgelesen werden.
	 */
	let announcement = $state('');
	let announcedTotal = 0;

	$effect(() => {
		if (progress) {
			if (announcedTotal > 0) return;
			announcedTotal = progress.total;
			announcement = `${photoCountLabel(progress.total)} ${progress.total === 1 ? 'wird' : 'werden'} verarbeitet …`;
			return;
		}
		if (announcedTotal === 0) return;
		// Bei Fehlern spricht die Fehlermeldung (role="alert"); eine Erfolgsmeldung daneben wäre
		// widersprüchlich und doppelt.
		announcement = processingError ? '' : `${photoCountLabel(announcedTotal)} verarbeitet`;
		announcedTotal = 0;
	});

	const hasUnassignedPhotos = $derived(photos.some((photo) => !usageCounts[photo.id]));

	/** Gibt alle ausgewählten Dateien gesammelt weiter. */
	const onFileSelected = async (event: Event & { currentTarget: HTMLInputElement }) => {
		const input = event.currentTarget;
		const files = Array.from(input.files ?? []);
		// Leeren, damit dieselbe Datei direkt danach erneut ausgewählt werden kann.
		input.value = '';
		if (files.length === 0) return;
		await onAddFiles(files);
	};
</script>

<div
	class="rounded-card bg-surface p-4 shadow-card sm:p-6"
	class:border-2={error}
	class:border-error-fg={error}
>
	<h2 id="photo-pool-heading" tabindex="-1" class="text-lg font-semibold text-ink md:text-xl">
		Beweisfotos *
	</h2>
	<p class="text-lg text-ink-muted">
		Wähle alle Fotos auf einmal aus — mindestens ein Foto ist erforderlich. Pro Fahrzeug sind
		maximal
		{maxPhotosPerVehicle} Fotos möglich.
	</p>

	<div class="mt-3 grid grid-cols-3 gap-2">
		{#each photos as photo (photo.id)}
			<div class="relative aspect-square">
				<button
					type="button"
					onclick={() => (lightboxPhoto = photo)}
					aria-label="Foto {photo.fileName} vergrößern{usageCounts[photo.id]
						? ''
						: ', nicht zugeordnet'}"
					class="group block size-full overflow-hidden rounded-control border border-border"
				>
					<img {@attach blobSrc(photo.blob)} alt="" class="size-full object-cover" />
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
				{#if !usageCounts[photo.id]}
					<span
						aria-hidden="true"
						class="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] rounded-control bg-surface px-1.5 py-0.5 text-sm leading-tight text-ink shadow-card"
					>
						nicht zugeordnet
					</span>
				{:else if usageCounts[photo.id] > 1}
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

		{#if progress}
			<div
				class="relative flex aspect-square items-center justify-center overflow-hidden rounded-control border border-border bg-surface-sunken"
				aria-hidden="true"
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

		<!-- Bleibt auch während der Verarbeitung eingehängt, damit der Fokus nicht verloren geht; das
		sr-only-Eingabefeld liegt im Label, damit dessen Fokusring sichtbar wird. -->
		<label
			for="photo-pool-input"
			class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-border text-base text-ink-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600"
		>
			<span class="text-xl" aria-hidden="true">+</span>
			Foto
			<input
				bind:this={fileInput}
				id="photo-pool-input"
				type="file"
				accept="image/*"
				multiple
				disabled={progress !== null}
				onchange={onFileSelected}
				class="sr-only"
			/>
		</label>
	</div>

	<p role="status" class="sr-only">{announcement}</p>
	{#if progress}
		<p aria-hidden="true" class="mt-2 text-lg text-ink-muted">{progressText}</p>
	{/if}
	{#if hasUnassignedPhotos}
		<p class="mt-2 text-lg text-ink-muted">Nicht zugeordnete Fotos werden nicht mitgesendet.</p>
	{/if}
	{#if processingError}<p role="alert" class="mt-2 text-lg text-error-fg">
			{processingError}
		</p>{/if}
	{#if error}<p role="alert" class="mt-2 text-lg text-error-fg">{error}</p>{/if}
</div>

<PhotoLightbox photo={lightboxPhoto} onClose={() => (lightboxPhoto = null)} />
