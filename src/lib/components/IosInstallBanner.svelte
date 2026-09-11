<script lang="ts">
	import { Share, SquarePlus } from '@lucide/svelte';
	import { browser } from '$app/environment';
	import { isIosSafari } from '$lib/pwa/isIosSafari';

	let visible = $state(false);

	if (browser) {
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		visible = !isStandalone && isIosSafari(navigator.userAgent);
	}

	// Bewusst kein "dauerhaft ausblenden" per localStorage — solange die App nicht als PWA
	// installiert ist, soll der Hinweis bei jedem Öffnen wieder erscheinen. Das Kreuz schließt
	// ihn nur für die aktuelle Ansicht.
	const dismiss = () => {
		visible = false;
	};
</script>

{#if visible}
	<div
		role="note"
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-primary-600 px-4 py-3 text-sm text-white shadow-card"
	>
		<p class="flex flex-wrap items-center gap-1">
			Installiere die App: Tippe auf <Share class="inline size-4 shrink-0" aria-hidden="true" />
			„Teilen“ und dann auf <SquarePlus class="inline size-4 shrink-0" aria-hidden="true" /> „Zum Home-Bildschirm“.
		</p>
		<button
			type="button"
			onclick={dismiss}
			aria-label="Hinweis schließen"
			class="shrink-0 rounded px-2 py-1 text-white/80 hover:text-white"
		>
			✕
		</button>
	</div>
{/if}
