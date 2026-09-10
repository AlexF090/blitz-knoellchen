<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
</script>

<svelte:head>
	{#if pwaInfo?.webManifest?.linkTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- statisch vom Build-Plugin erzeugt, keine Nutzereingabe -->
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
	<h1 class="text-xl font-semibold">Knöllchen-Blitz</h1>
	<p class="text-gray-600">Formular folgt in Phase 2.</p>
</main>
