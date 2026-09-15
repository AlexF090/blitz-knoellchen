<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PhotoLightbox, { type LightboxPhoto } from '$lib/components/PhotoLightbox.svelte';
	import { clearEntries, deleteEntry, listEntries, type HistoryEntry } from '$lib/history/db';
	import {
		buttonDestructive,
		buttonDestructiveSecondary,
		buttonSecondary
	} from '$lib/ui/buttonStyles';
	import { Trash2 } from '@lucide/svelte';

	let entries = $state<HistoryEntry[]>([]);
	let loaded = $state(false);
	let lightboxTarget = $state<{ entryId: string; index: number } | null>(null);
	let entryToDelete = $state<HistoryEntry | null>(null);
	let entryDialog = $state<HTMLDialogElement | undefined>(undefined);
	let deleteAllDialog = $state<HTMLDialogElement | undefined>(undefined);

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

	const revokeEntryUrls = (entryId: string) => {
		for (const url of objectUrlsByEntry.get(entryId) ?? []) URL.revokeObjectURL(url);
		objectUrlsByEntry.delete(entryId);
	};

	const openEntryDialog = (entry: HistoryEntry) => {
		entryToDelete = entry;
		entryDialog?.showModal();
	};

	const confirmDeleteEntry = async () => {
		const entry = entryToDelete;
		if (!entry) return;
		await deleteEntry(entry.id);
		entries = entries.filter((candidate) => candidate.id !== entry.id);
		revokeEntryUrls(entry.id);
		entryToDelete = null;
		entryDialog?.close();
	};

	const confirmDeleteAll = async () => {
		await clearEntries();
		for (const entryId of [...objectUrlsByEntry.keys()]) revokeEntryUrls(entryId);
		entries = [];
		deleteAllDialog?.close();
	};
</script>

<svelte:head>
	<title>Historie – Blitz-Knöllchen</title>
</svelte:head>

<PageHeader linkHref={resolve('/')} linkLabel="Zurück" linkIcon="back" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-xl font-semibold tracking-tight text-ink md:text-2xl">Historie</h1>
		{#if entries.length > 0}
			<button
				type="button"
				onclick={() => deleteAllDialog?.showModal()}
				class="{buttonDestructiveSecondary} text-base"
			>
				Alle löschen
			</button>
		{/if}
	</div>

	{#if !loaded}
		<p role="status" class="text-ink-muted">Historie wird geladen…</p>
	{:else if entries.length === 0}
		<p role="status" class="text-ink-muted">Noch keine Anzeigen versendet.</p>
	{/if}

	<ul class="flex flex-col gap-3">
		{#each entries as entry (entry.id)}
			<li class="rounded-card bg-surface p-3 shadow-card">
				<div class="flex items-start justify-between gap-2">
					<h2 class="text-lg font-medium text-ink">{entry.incidentTypeLabels.join(', ')}</h2>
					<button
						type="button"
						onclick={() => openEntryDialog(entry)}
						aria-label="Eintrag löschen"
						title="Löschen"
						class="flex size-11 shrink-0 items-center justify-center rounded-full text-error-fg hover:bg-error-fg/10"
					>
						<Trash2 class="size-5" aria-hidden="true" />
					</button>
				</div>
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

<ConfirmDialog
	bind:dialog={entryDialog}
	titleId="delete-entry-dialog-title"
	title="Eintrag löschen?"
>
	<p class="mt-1 text-lg text-ink-muted">
		{#if entryToDelete}
			{entryToDelete.licensePlate ?? entryToDelete.locationAddress} ·
			{new Date(entryToDelete.timestamp).toLocaleString('de-DE')} wird unwiderruflich gelöscht.
		{/if}
	</p>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => {
				entryDialog?.close();
				entryToDelete = null;
			}}
			class="flex-1 {buttonSecondary}"
		>
			Abbrechen
		</button>
		<button type="button" onclick={confirmDeleteEntry} class="flex-1 {buttonDestructive}">
			Löschen
		</button>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:dialog={deleteAllDialog}
	titleId="delete-all-dialog-title"
	title="Alle Einträge löschen?"
>
	<p class="mt-1 text-lg text-ink-muted">
		Alle {entries.length} Einträge werden unwiderruflich aus der Historie gelöscht.
	</p>
	{#snippet actions()}
		<button type="button" onclick={() => deleteAllDialog?.close()} class="flex-1 {buttonSecondary}">
			Abbrechen
		</button>
		<button type="button" onclick={confirmDeleteAll} class="flex-1 {buttonDestructive}">
			Alle löschen
		</button>
	{/snippet}
</ConfirmDialog>
