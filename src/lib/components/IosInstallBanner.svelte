<script lang="ts">
	import { Share, SquarePlus } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { isIosSafari } from '$lib/pwa/isIosSafari';
	import { installPrompt } from '$lib/pwa/installPrompt.svelte';

	let isIosSafariUser = $state(false);
	let dismissed = $state(false);

	if (browser) {
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		isIosSafariUser = !isStandalone && isIosSafari(navigator.userAgent);
	}

	// installPrompt.canInstall hat Vorrang: Der native Chromium-Weg (InstallBanner.svelte) ist
	// zuverlässiger als diese UA-Heuristik. Ohne diesen Ausschluss könnten in Browser-Edge-Fällen
	// (UA, die von isIosSafari fälschlich erkannt wird, aber dennoch beforeinstallprompt feuert)
	// beide role="note"-Banner gleichzeitig sichtbar sein.
	const visible = $derived(isIosSafariUser && !installPrompt.canInstall && !dismissed);

	// Bewusst kein "dauerhaft ausblenden" per localStorage — solange die App nicht als PWA
	// installiert ist, soll der Hinweis bei jedem Öffnen wieder erscheinen. Das Kreuz schließt
	// ihn nur für die aktuelle Ansicht.
	const dismiss = () => {
		dismissed = true;
	};
</script>

{#if visible}
	<div
		role="note"
		transition:fly={{ y: 80, duration: transitionDuration(250) }}
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-primary-600/90 px-4 py-3 text-sm text-white shadow-card backdrop-blur-sm"
	>
		<p class="flex flex-wrap items-center gap-2">
			Installiere die App: Tippe auf <Share class="inline size-4 shrink-0" aria-hidden="true" />
			„Teilen“ und dann auf <SquarePlus class="inline size-4 shrink-0" aria-hidden="true" /> „Zum Home-Bildschirm“.
		</p>
		<button
			type="button"
			onclick={dismiss}
			aria-label="Hinweis schließen"
			class="shrink-0 rounded p-2.5 text-white/80 hover:text-white"
		>
			✕
		</button>
	</div>
{/if}
