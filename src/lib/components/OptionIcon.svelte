<script lang="ts">
	/**
	 * Dekoratives Icon vor einer Checkbox-Option: Verkehrszeichen, Emoji oder Lucide-Icon. Für
	 * Screenreader ausgeblendet, weil das Label daneben die Bedeutung trägt.
	 */
	import type { OptionIcon } from '$lib/config/optionIcon';

	interface Props {
		icon: OptionIcon;
	}

	let { icon }: Props = $props();

	// Mehrere Emojis (z.B. zwei Autos für die zweite Reihe) müssen in dieselbe Spalte passen wie ein
	// einzelnes, damit die Labels bündig bleiben.
	const emojiCount = $derived(
		icon.kind === 'emoji' ? [...new Intl.Segmenter().segment(icon.character)].length : 0
	);
</script>

<!-- Feste Spaltenbreite für alle Icon-Arten, damit die Labels untereinander bündig stehen. -->
<span aria-hidden="true" class="flex h-6 w-8 shrink-0 items-center justify-center">
	{#if icon.kind === 'sign'}
		<img src={icon.src} alt="" class="size-6" />
	{:else if icon.kind === 'emoji'}
		<span class={['leading-none whitespace-nowrap', emojiCount > 1 ? 'text-xs' : 'text-xl']}
			>{icon.character}</span
		>
	{:else}
		{@const Symbol = icon.component}
		<Symbol class="size-6 text-ink-muted" />
	{/if}
</span>
