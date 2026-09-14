<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SummaryRow } from '$lib/report/vehicleSummary';

	interface Props {
		rows: SummaryRow[];
		// Für Zeilen, die keine reine Label/Value-Zeile sind (z.B. Foto-Thumbnails statt Anzahl).
		leading?: Snippet;
		class?: string;
	}

	let { rows, leading, class: className = 'mt-3 flex flex-col gap-3 text-lg' }: Props = $props();
</script>

<dl class={className}>
	{@render leading?.()}
	{#each rows as row (row.label)}
		<div>
			<dt class="text-base font-medium text-ink-muted">{row.label}</dt>
			<dd class="text-ink">{row.value}</dd>
		</div>
	{/each}
</dl>
