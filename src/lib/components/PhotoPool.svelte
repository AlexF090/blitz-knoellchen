<script lang="ts">
	import type { PhotoEntry } from '$lib/validation/formSchema';
	import PhotoLightbox from './PhotoLightbox.svelte';

	interface Props {
		photos: PhotoEntry[];
		usageCounts?: Record<string, number>;
		error?: string | null;
		processingError?: string | null;
		processing?: boolean;
		maxPhotos: number;
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
		onAdd,
		onRemove
	}: Props = $props();

	let fileInput: HTMLInputElement | undefined;
	let lightboxPhoto: PhotoEntry | null = $state(null);

	const objectUrl = (blob: Blob) => URL.createObjectURL(blob);

	const onFileSelected = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		await onAdd(file);
	};
</script>

<div
	class="rounded-card bg-surface p-4 shadow-card sm:p-6"
	class:border-2={error}
	class:border-error-fg={error}
>
	<p class="text-sm font-medium text-ink">Beweisfotos *</p>
	<p class="text-sm text-ink-muted">Mindestens ein Foto ist erforderlich, maximal {maxPhotos}.</p>

	<div class="mt-3 grid grid-cols-3 gap-2">
		{#each photos as photo (photo.id)}
			<div class="relative aspect-square overflow-hidden rounded-control border border-border">
				<button
					type="button"
					onclick={() => (lightboxPhoto = photo)}
					aria-label="Foto {photo.fileName} vergrößern"
					class="group block h-full w-full"
				>
					<img
						src={objectUrl(photo.blob)}
						alt="Beweisfoto {photo.fileName}"
						class="h-full w-full object-cover"
					/>
					<span
						class="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-opacity group-hover:bg-ink/20 group-hover:opacity-100 pointer-coarse:bg-ink/20 pointer-coarse:opacity-100"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="h-6 w-6 text-white"
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
						class="absolute top-1 left-1 rounded-full bg-primary-600 px-1.5 py-0.5 text-xs text-white"
					>
						{usageCounts[photo.id]}×
					</span>
				{/if}
				<button
					type="button"
					onclick={() => onRemove(photo.id)}
					aria-label="Foto entfernen"
					class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-ink shadow-card"
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
					class="h-6 w-6 animate-spin text-ink-muted"
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
				class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-border text-xs text-ink-muted"
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
		capture="environment"
		onchange={onFileSelected}
		class="sr-only"
	/>

	{#if processingError}<p class="mt-2 text-sm text-error-fg">{processingError}</p>{/if}
	{#if error}<p role="alert" class="mt-2 text-sm text-error-fg">{error}</p>{/if}
</div>

<PhotoLightbox photo={lightboxPhoto} onClose={() => (lightboxPhoto = null)} />
