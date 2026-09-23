<script lang="ts">
	/**
	 * Installationshinweis für iOS Safari, das keinen nativen Installations-Prompt kennt und
	 * stattdessen eine Anleitung über „Teilen“ → „Zum Home-Bildschirm“ braucht.
	 */
	import { Share, SquarePlus } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { isIosSafari } from '$lib/pwa/isIosSafari';
	import { installPrompt } from '$lib/pwa/installPrompt.svelte';

	let isIosSafariUser = $state(false);
	// Bewusst kein dauerhaftes Ausblenden per localStorage — solange die App nicht installiert
	// ist, soll der Hinweis bei jedem Öffnen wiederkommen.
	let dismissed = $state(false);

	// Der SSR-Zweig ist im Browser-Testprojekt nicht erreichbar.
	/* istanbul ignore else */
	if (browser) {
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		isIosSafariUser = !isStandalone && isIosSafari(navigator.userAgent);
	}

	// installPrompt.canInstall hat Vorrang: der native Chromium-Weg (InstallBanner.svelte) ist
	// zuverlässiger als diese UA-Heuristik. Ohne den Ausschluss wären in Edge-Fällen (UA, die
	// isIosSafari fälschlich erkennt, aber dennoch beforeinstallprompt feuert) beide
	// role="note"-Banner gleichzeitig sichtbar.
	const visible = $derived(isIosSafariUser && !installPrompt.canInstall && !dismissed);

	/** Blendet den Hinweis nur für die aktuelle Ansicht aus. */
	const dismiss = () => {
		dismissed = true;
	};
</script>

{#if visible}
	<div
		role="note"
		transition:fly={{ y: 80, duration: transitionDuration(250) }}
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-primary-button/90 px-4 py-3 text-base text-on-primary shadow-card backdrop-blur-sm"
	>
		<p class="flex flex-wrap items-center gap-2">
			Installiere die App: Tippe auf <Share class="inline size-4 shrink-0" aria-hidden="true" />
			„Teilen“ und dann auf <SquarePlus class="inline size-4 shrink-0" aria-hidden="true" /> „Zum Home-Bildschirm“.
		</p>
		<button
			type="button"
			onclick={dismiss}
			aria-label="Hinweis schließen"
			class="flex size-11 shrink-0 items-center justify-center rounded text-on-primary/80 hover:text-on-primary"
		>
			✕
		</button>
	</div>
{/if}
