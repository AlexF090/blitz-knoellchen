<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		dialog: HTMLDialogElement | undefined;
		titleId: string;
		title: string;
		children: Snippet;
		actions: Snippet;
		onBackdropClick: (event: MouseEvent) => void;
		// Erlaubt Dialogen mit mehr Inhalt (z.B. E-Mail-Vorschau) auf Desktop-Breakpoints breiter
		// zu sein als der Standard-Bestätigungsdialog — Mobile bleibt davon unberührt (immer volle
		// Breite als Bottom-Sheet).
		desktopMaxWidthClass?: string;
	}

	let {
		dialog = $bindable(),
		titleId,
		title,
		children,
		actions,
		onBackdropClick,
		desktopMaxWidthClass = 'sm:max-w-sm'
	}: Props = $props();
</script>

<dialog
	bind:this={dialog}
	onclick={onBackdropClick}
	aria-labelledby={titleId}
	class="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85vh] w-full max-w-none overflow-y-auto
		rounded-t-card rounded-b-none border-t border-surface/40 bg-surface/70 p-4 shadow-overlay
		backdrop-blur-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto
		sm:max-h-[85vh] sm:w-[90vw] {desktopMaxWidthClass} sm:rounded-card sm:border sm:p-6"
>
	<h3 id={titleId} class="text-sm font-semibold text-ink">{title}</h3>
	{@render children()}
	<div class="mt-4 flex gap-2">{@render actions()}</div>
</dialog>
