<script lang="ts">
	import { Loader2 } from '@lucide/svelte';
	import { reloadWithLatestVersion } from '$lib/pwa/reloadLatest';

	let { children } = $props();

	// overscroll-behavior-y: none (layout.css) blockt das native Pull-to-refresh-Gesture des
	// Browsers bewusst — dieses eigene Gesture ersetzt es, inkl. erzwungenem
	// Service-Worker-Update statt nur Anzeige der gecachten App-Shell (reloadLatest.ts).
	const PULL_THRESHOLD = 72;
	const MAX_PULL = 120;
	const DAMPING = 0.5;
	const MAX_BLUR_PX = 6;

	let container: HTMLDivElement | undefined = $state();
	let pulling = $state(false);
	let refreshing = $state(false);
	let pullDistance = $state(0);
	let startY = 0;

	const progress = $derived(Math.min(pullDistance / PULL_THRESHOLD, 1));

	const atTop = () => (document.scrollingElement?.scrollTop ?? 0) <= 0;

	const onTouchStart = (event: TouchEvent) => {
		if (refreshing || !atTop()) return;
		pulling = true;
		startY = event.touches[0].clientY;
	};

	// touchmove muss non-passive registriert sein (siehe $effect unten) — sonst übernimmt Chrome
	// die Geste als natives Scrollen. Pointer-Events reichen nicht: deren preventDefault() greift
	// nur, wenn der Browser die Geste noch nicht fürs Scrollen "committed" hat.
	const onTouchMove = (event: TouchEvent) => {
		if (!pulling || refreshing) return;
		const delta = event.touches[0].clientY - startY;
		if (delta <= 0 || !atTop()) {
			pulling = false;
			pullDistance = 0;
			return;
		}
		event.preventDefault();
		pullDistance = Math.min(delta * DAMPING, MAX_PULL);
	};

	const endPull = async () => {
		if (!pulling) return;
		pulling = false;
		if (pullDistance >= PULL_THRESHOLD) {
			refreshing = true;
			await reloadWithLatestVersion();
		} else {
			pullDistance = 0;
		}
	};

	$effect(() => {
		if (!container) return;
		const el = container;
		el.addEventListener('touchstart', onTouchStart, { passive: true });
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		el.addEventListener('touchend', endPull);
		el.addEventListener('touchcancel', endPull);
		return () => {
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
			el.removeEventListener('touchend', endPull);
			el.removeEventListener('touchcancel', endPull);
		};
	});
</script>

<div bind:this={container} role="presentation">
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		style:opacity={refreshing ? 1 : progress}
		style:transition={pulling ? 'none' : 'opacity 200ms ease-out'}
	>
		<div
			class="rounded-full bg-surface p-4 shadow-card"
			style:transform="scale({refreshing ? 1 : progress})"
			style:transition={pulling ? 'none' : 'transform 200ms ease-out'}
		>
			<Loader2
				class="size-8 text-primary-600 {refreshing ? 'animate-spin' : ''}"
				style={refreshing ? undefined : `transform: rotate(${progress * 360}deg)`}
			/>
		</div>
	</div>
	<div
		style:filter="blur({(refreshing ? 1 : progress) * MAX_BLUR_PX}px)"
		style:transition={pulling ? 'none' : 'filter 200ms ease-out'}
	>
		{@render children()}
	</div>
</div>
