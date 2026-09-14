<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		dialog: HTMLDialogElement | undefined;
		titleId: string;
		title: string;
		children: Snippet;
		actions: Snippet;
		// Erlaubt Dialogen mit mehr Inhalt (z.B. E-Mail-Vorschau) auf Desktop-Breakpoints breiter
		// zu sein als der Standard-Bestätigungsdialog — Mobile bleibt davon unberührt (immer volle
		// Breite als Bottom-Sheet).
		desktopMaxWidthClass?: string;
		// Für Dialoge, die eine aktive Entscheidung erzwingen (z.B. Demo-/Live-Modus-Auswahl) —
		// unterbindet das Schließen per Escape-Taste und Backdrop-Klick.
		dismissable?: boolean;
	}

	let {
		dialog = $bindable(),
		titleId,
		title,
		children,
		actions,
		desktopMaxWidthClass = 'sm:max-w-sm',
		dismissable = true
	}: Props = $props();

	const oncancel = (event: Event) => {
		if (!dismissable) event.preventDefault();
	};

	const onBackdropClick = (event: MouseEvent) => {
		if (dismissable && event.target === dialog) dialog?.close();
	};
</script>

<dialog
	bind:this={dialog}
	onclick={onBackdropClick}
	{oncancel}
	aria-labelledby={titleId}
	class="fixed inset-x-0 top-auto bottom-0 m-0 flex max-h-[85vh] w-full max-w-none flex-col
		rounded-t-card rounded-b-none border-t border-surface/40 bg-surface/70 p-4 shadow-overlay
		backdrop-blur-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto
		sm:max-h-[85vh] sm:w-[90vw] {desktopMaxWidthClass} sm:rounded-card sm:border sm:p-6"
>
	<div class="overflow-y-auto">
		<h3 id={titleId} class="text-lg font-semibold text-ink md:text-xl">{title}</h3>
		{@render children()}
	</div>
	<div class="mt-4 flex shrink-0 gap-2">{@render actions()}</div>
</dialog>
