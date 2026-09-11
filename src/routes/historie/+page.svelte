<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listEntries, type HistoryEntry } from '$lib/history/db';

	let entries = $state<HistoryEntry[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		entries = await listEntries();
		loaded = true;
	});
</script>

<svelte:head>
	<title>Historie – Knöllchen-Blitz</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Historie</h1>
		<a href={resolve('/')} class="text-sm text-blue-700 underline">Zurück</a>
	</div>

	{#if loaded && entries.length === 0}
		<p class="text-gray-600">Noch keine Anzeigen versendet.</p>
	{/if}

	<ul class="flex flex-col gap-3">
		{#each entries as entry (entry.id)}
			<li class="rounded border p-3">
				<p class="font-medium">{entry.incidentTypeLabels.join(', ')}</p>
				<p class="text-sm text-gray-600">{entry.locationAddress}</p>
				<p class="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString('de-DE')}</p>
			</li>
		{/each}
	</ul>
</main>
