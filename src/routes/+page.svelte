<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ReportForm from '$lib/components/ReportForm.svelte';
</script>

<svelte:head>
	<title>Blitz-Knöllchen – Falschparker melden</title>
	{#if pwaInfo?.webManifest?.linkTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- statisch vom Build-Plugin erzeugt, keine Nutzereingabe -->
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>

<PageHeader title="Blitz-Knöllchen" linkHref={resolve('/historie')} linkLabel="Historie" />
<main
	class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 py-4 sm:p-6 md:max-w-3xl md:py-8 lg:max-w-5xl"
>
	<ReportForm />
</main>
