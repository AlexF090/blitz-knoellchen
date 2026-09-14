<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PhotoLightbox, { type LightboxPhoto } from '$lib/components/PhotoLightbox.svelte';
	import { listEntries, type HistoryEntry } from '$lib/history/db';

	let entries = $state<HistoryEntry[]>([]);
	let loaded = $state(false);
	let lightboxTarget = $state<{ entryId: string; index: number } | null>(null);

	// Object-URLs werden einmalig beim Laden erzeugt (die Liste ändert sich danach nicht mehr)
	// und müssen daher explizit freigegeben werden, statt reaktiv wie in PhotoLightbox selbst.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const objectUrlsByEntry = new Map<string, string[]>();

	onMount(async () => {
		entries = await listEntries();
		for (const entry of entries) {
			objectUrlsByEntry.set(
				entry.id,
				entry.thumbnails.map((blob) => URL.createObjectURL(blob))
			);
		}
		loaded = true;
	});

	onDestroy(() => {
		for (const urls of objectUrlsByEntry.values()) {
			for (const url of urls) URL.revokeObjectURL(url);
		}
	});

	const lightboxPhoto = $derived.by((): LightboxPhoto | null => {
		const target = lightboxTarget;
		if (!target) return null;
		const entry = entries.find((candidate) => candidate.id === target.entryId);
		const blob = entry?.thumbnails[target.index];
		if (!entry || !blob) return null;
		const position = `${target.index + 1} von ${entry.thumbnails.length}`;
		return {
			blob,
			alt: entry.licensePlate
				? `Beweisfoto ${position} zu Kennzeichen ${entry.licensePlate}`
				: `Beweisfoto ${position}`
		};
	});
</script>

<svelte:head>
	<title>Historie – Blitz-Knöllchen</title>
</svelte:head>

<PageHeader title="Historie" linkHref={resolve('/')} linkLabel="Zurück" linkIcon="back" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	{#if !loaded}
		<p role="status" class="text-ink-muted">Historie wird geladen…</p>
	{:else if entries.length === 0}
		<p role="status" class="text-ink-muted">Noch keine Anzeigen versendet.</p>
	{/if}

	<ul class="flex flex-col gap-3">
		{#each entries as entry (entry.id)}
			<li class="rounded-card bg-surface p-3 shadow-card">
				<p class="text-lg font-medium text-ink">{entry.incidentTypeLabels.join(', ')}</p>
				<p class="text-lg text-ink-muted">{entry.locationAddress}</p>
				{#if entry.licensePlate}
					<p class="text-base text-ink-muted">
						{entry.licensePlate} · {entry.make} · {entry.color}
					</p>
				{/if}
				<p class="text-base text-ink-muted">{new Date(entry.timestamp).toLocaleString('de-DE')}</p>

				{#if entry.thumbnails.length > 0}
					<div class="mt-2 grid grid-cols-4 gap-2">
						{#each objectUrlsByEntry.get(entry.id) ?? [] as url, index (url)}
							<button
								type="button"
								onclick={() => (lightboxTarget = { entryId: entry.id, index })}
								aria-label="Beweisfoto {index + 1} von {entry.thumbnails.length} vergrößern"
								class="block aspect-square overflow-hidden rounded-control border border-border"
							>
								<img src={url} alt="" class="size-full object-cover" />
							</button>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</main>

<PhotoLightbox photo={lightboxPhoto} onClose={() => (lightboxTarget = null)} />
