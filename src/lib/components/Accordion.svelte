<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { ChevronDown } from '@lucide/svelte';
	import { transitionDuration } from '$lib/motion/reducedMotion';

	export interface AccordionItem {
		id: string;
		question: string;
		answer: Snippet;
	}

	interface Props {
		items: AccordionItem[];
	}

	let { items }: Props = $props();

	let openId = $state<string | null>(null);

	/** Öffnet ein Panel und schließt das zuvor offene — es ist stets höchstens eines offen. */
	const toggle = (id: string) => {
		openId = openId === id ? null : id;
	};
</script>

<div class="flex flex-col gap-2">
	{#each items as item (item.id)}
		<div class="rounded-card bg-surface shadow-card">
			<h3>
				<button
					type="button"
					onclick={() => toggle(item.id)}
					aria-expanded={openId === item.id}
					aria-controls="{item.id}-panel"
					id="{item.id}-button"
					class="flex w-full items-center justify-between gap-3 p-3 text-left font-semibold text-ink"
				>
					{item.question}
					<ChevronDown
						class="size-5 shrink-0 text-ink-muted transition-transform duration-200 {openId ===
						item.id
							? 'rotate-180'
							: ''}"
						aria-hidden="true"
					/>
				</button>
			</h3>
			{#if openId === item.id}
				<div
					id="{item.id}-panel"
					role="region"
					aria-labelledby="{item.id}-button"
					transition:slide={{ duration: transitionDuration(200) }}
				>
					<div class="px-3 pb-3 leading-relaxed text-ink">
						{@render item.answer()}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
