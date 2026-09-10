<script lang="ts">
	import { browser } from '$app/environment';
	import { isIosSafari } from '$lib/pwa/isIosSafari';

	const DISMISS_KEY = 'knoellchen-blitz:ios-install-banner-dismissed';

	let visible = $state(false);

	if (browser) {
		const alreadyDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		visible = !alreadyDismissed && !isStandalone && isIosSafari(navigator.userAgent);
	}

	function dismiss() {
		visible = false;
		if (browser) localStorage.setItem(DISMISS_KEY, 'true');
	}
</script>

{#if visible}
	<div
		role="note"
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-blue-700 px-4 py-3 text-sm text-white shadow-lg"
	>
		<p>
			Installiere die App: Tippe auf <span aria-hidden="true">⬆️</span> „Teilen“ und dann „Zum Home-Bildschirm“.
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
