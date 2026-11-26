<script lang="ts">
	import { resolve } from '$app/paths';
	import { IMPRESSUM_URL } from '#lib/site.ts';
	import { installPrompt } from '#lib/pwa/installPrompt.svelte.ts';
</script>

<footer
	class="mt-8 flex flex-col items-center gap-1 border-t border-border pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-xs text-ink-muted"
>
	<p class="flex flex-wrap items-center justify-center gap-x-1">
		<a href={resolve('/faq')} class="inline-block px-2 py-2 underline">FAQ</a>
		<span aria-hidden="true">·</span>
		<a href={resolve('/datenschutz')} class="inline-block px-2 py-2 underline">Datenschutz</a>
		<span aria-hidden="true">·</span>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- externe URL, kein App-Pfad -->
		<a
			href={IMPRESSUM_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-block px-2 py-2 underline"
		>
			Impressum
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
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
		<!-- Pflicht im Free-Tarif von Geoapify: sichtbarer Follow-Link plus OSM-Hinweis. -->
		<span class="inline-block px-2 py-2">
			<a href="https://www.geoapify.com/" target="_blank" rel="noopener" class="underline">
				Powered by Geoapify
			</a>
			·
			<a
				href="https://www.openstreetmap.org/copyright"
				target="_blank"
				rel="noopener noreferrer"
				class="underline"
			>
				© OpenStreetMap
			</a>
		</span>
	</p>
	<p>v{__APP_VERSION__}</p>
</footer>
