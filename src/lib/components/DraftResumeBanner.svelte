<script lang="ts">
	/**
	 * Hinweis auf einen ungesendeten Entwurf beim Öffnen der App: Der Nutzer entscheidet, ob er
	 * ihn fortsetzt oder verwirft. Die Rückfrage vor dem Verwerfen übernimmt der Aufrufer.
	 */
	import { formatTimestampDE } from '$lib/format/germanDate';
	import { buttonDestructiveSecondary, buttonPrimary } from '$lib/ui/buttonStyles';

	interface Props {
		/** Zeitpunkt der letzten Speicherung in Millisekunden. */
		savedAt: number;
		vehicleCount: number;
		photoCount: number;
		onResume: () => void;
		onDiscard: () => void;
	}

	let { savedAt, vehicleCount, photoCount, onResume, onDiscard }: Props = $props();

	const summary = $derived.by(() => {
		const vehicleLabel = vehicleCount === 1 ? '1 Fahrzeug' : `${vehicleCount} Fahrzeuge`;
		const photoLabel = photoCount === 1 ? '1 Foto' : `${photoCount} Fotos`;
		return `Ungesendeter Entwurf vom ${formatTimestampDE(savedAt)} – ${vehicleLabel}, ${photoLabel}`;
	});
</script>

<!-- Ein benannter Bereich statt role="status": Der Hinweis ist Teil der Seite und bleibt, bis der
Nutzer entscheidet; eine Live-Region würde ihn nur einmal beim Erscheinen vorlesen. Der Fokus
bleibt unangetastet. -->
<section
	aria-labelledby="draft-resume-title"
	class="rounded-card bg-surface p-4 shadow-card sm:p-6"
>
	<h2 id="draft-resume-title" class="text-lg font-semibold text-ink md:text-xl">
		Entwurf fortsetzen?
	</h2>
	<p class="mt-1 text-lg text-ink-muted">{summary}</p>
	<div class="mt-4 flex gap-2">
		<button type="button" onclick={onDiscard} class={['flex-1', buttonDestructiveSecondary]}>
			Verwerfen
		</button>
		<button type="button" onclick={onResume} class={['flex-1', buttonPrimary]}>Fortsetzen</button>
	</div>
</section>
