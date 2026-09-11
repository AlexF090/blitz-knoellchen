<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
	import { resolve } from '$app/paths';
	import ReportForm from '$lib/components/ReportForm.svelte';
</script>

<svelte:head>
	<title>Blitz-Knöllchen – Falschparker melden</title>
	{#if pwaInfo?.webManifest?.linkTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- statisch vom Build-Plugin erzeugt, keine Nutzereingabe -->
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>

<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-ink md:text-2xl">Blitz-Knöllchen</h1>
		<a href={resolve('/historie')} class="text-sm text-primary-600 underline">Historie</a>
	</div>
	<ReportForm />
</main>
