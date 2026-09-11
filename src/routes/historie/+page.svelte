<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { listEntries, type HistoryEntry } from '$lib/history/db';

	let entries = $state<HistoryEntry[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		entries = await listEntries();
		loaded = true;
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
				<p class="font-medium text-ink">{entry.incidentTypeLabels.join(', ')}</p>
				<p class="text-sm text-ink-muted">{entry.locationAddress}</p>
				{#if entry.licensePlate}
					<p class="text-xs text-ink-muted">
						{entry.licensePlate} · {entry.make} · {entry.color}
					</p>
				{/if}
				<p class="text-xs text-ink-muted">{new Date(entry.timestamp).toLocaleString('de-DE')}</p>
			</li>
		{/each}
	</ul>
</main>
