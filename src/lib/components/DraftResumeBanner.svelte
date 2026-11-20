<script lang="ts">
	/**
	 * Hinweis auf einen ungesendeten Entwurf beim Öffnen der App: Der Nutzer entscheidet, ob er
	 * ihn fortsetzt oder verwirft. Die Rückfrage vor dem Verwerfen übernimmt der Aufrufer.
	 */
	import { formatTimestampDE } from '#lib/format/germanDate.ts';
	import { buttonDestructiveSecondary, buttonPrimary } from '#lib/ui/buttonStyles.ts';

	interface Props {
		/** Zeitpunkt der letzten Speicherung in Millisekunden. */
		savedAt: number;
		vehicleCount: number;
		photoCount: number;
		onResume: () => void;
		onDiscard: () => void;
	}

	let { savedAt, vehicleCount, photoCount, onResume, onDiscard }: Props = $props();

	// Dativ nach „mit“: „1 Fahrzeug“, aber „2 Fahrzeugen“.
	const vehicleLabel = $derived(vehicleCount === 1 ? '1 Fahrzeug' : `${vehicleCount} Fahrzeugen`);
	const photoLabel = $derived(photoCount === 1 ? '1 Foto' : `${photoCount} Fotos`);
</script>

<!-- Ein benannter Bereich statt role="status": Der Hinweis ist Teil der Seite und bleibt, bis der
Nutzer entscheidet; eine Live-Region würde ihn nur einmal beim Erscheinen vorlesen. Beim
Erscheinen bleibt der Fokus unangetastet; nach der Entscheidung setzt ihn der Aufrufer neu, weil
der Hinweis samt fokussiertem Button verschwindet. -->
<section
	aria-labelledby="draft-resume-title"
	class="rounded-card bg-surface p-4 shadow-card sm:p-6"
>
	<h2 id="draft-resume-title" class="text-lg font-semibold text-ink md:text-xl">
		Entwurf fortsetzen?
	</h2>
	<p class="mt-1 text-lg text-ink-muted">
		Ungesendeter Entwurf vom
		<time datetime={new Date(savedAt).toISOString()}>{formatTimestampDE(savedAt)}</time>
		mit {vehicleLabel} und {photoLabel}
	</p>
	<div class="mt-4 flex gap-2">
		<button type="button" onclick={onDiscard} class={['flex-1', buttonDestructiveSecondary]}>
			Verwerfen
		</button>
		<button type="button" onclick={onResume} class={['flex-1', buttonPrimary]}>Fortsetzen</button>
	</div>
</section>
