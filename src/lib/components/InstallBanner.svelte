<script lang="ts">
	import { SquarePlus } from '@lucide/svelte';
	import { installPrompt } from '$lib/pwa/installPrompt.svelte';

	// Bewusst kein "dauerhaft ausblenden" per localStorage — solange die App nicht als PWA
	// installiert ist (installPrompt.canInstall wird erst durch das appinstalled-Event false),
	// soll der Hinweis bei jedem Öffnen wieder erscheinen. Das Kreuz schließt ihn nur für die
	// aktuelle Ansicht.
	let dismissed = $state(false);

	const dismiss = () => {
		dismissed = true;
	};

	const install = async () => {
		await installPrompt.prompt();
	};
</script>

{#if installPrompt.canInstall && !dismissed}
	<div
		role="note"
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-primary-600 px-4 py-3 text-sm text-white shadow-card"
	>
		<p class="flex items-center gap-2">
			<SquarePlus class="size-5 shrink-0" aria-hidden="true" />
			Installiere die App für schnellen Zugriff.
		</p>
		<div class="flex shrink-0 items-center gap-2">
			<button
				type="button"
				onclick={install}
				class="rounded-control bg-white px-3 py-1.5 font-medium text-primary-600"
			>
				Installieren
			</button>
			<button
				type="button"
				onclick={dismiss}
				aria-label="Hinweis schließen"
				class="rounded p-2.5 text-white/80 hover:text-white"
			>
				✕
			</button>
		</div>
	</div>
{/if}
