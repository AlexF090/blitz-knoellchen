<script lang="ts">
	import { resolve } from '$app/paths';
	import { installPrompt } from '$lib/pwa/installPrompt.svelte';
</script>

<footer
	class="mt-8 flex flex-col items-center gap-1 border-t border-border pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-xs text-ink-muted"
>
	<p class="flex flex-wrap items-center justify-center gap-x-1">
		<a href={resolve('/faq')} class="inline-block px-2 py-2 underline">FAQ</a>
		<span aria-hidden="true">·</span>
		<a href={resolve('/datenschutz')} class="inline-block px-2 py-2 underline">Datenschutz</a>
		{#if installPrompt.canInstall}
			<span aria-hidden="true">·</span>
			<button
				type="button"
				onclick={() => installPrompt.prompt()}
				class="inline-block px-2 py-2 underline"
			>
				App installieren
			</button>
		{/if}
		<span aria-hidden="true">·</span>
		<span class="inline-block px-2 py-2">
			Adressdaten:
			<a href="https://locationiq.com" target="_blank" rel="noopener noreferrer" class="underline"
				>LocationIQ</a
			>
		</span>
	</p>
	<p>v{__APP_VERSION__}</p>
</footer>
