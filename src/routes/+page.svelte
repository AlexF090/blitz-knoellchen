<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
	import { resolve } from '$app/paths';
	import ReportForm from '$lib/components/ReportForm.svelte';
</script>

<svelte:head>
	<title>Knöllchen-Blitz – Falschparker melden</title>
	{#if pwaInfo?.webManifest?.linkTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- statisch vom Build-Plugin erzeugt, keine Nutzereingabe -->
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Knöllchen-Blitz</h1>
		<a href={resolve('/historie')} class="text-sm text-blue-700 underline">Historie</a>
	</div>
	<ReportForm />
</main>
