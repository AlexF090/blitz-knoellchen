<script lang="ts">
	/**
	 * Modaler Basisdialog für Rückfragen und Vorschauen — auf Mobile ein Bottom-Sheet, auf
	 * Desktop eine zentrierte Karte. Der Aufrufer öffnet ihn über die gebundene `dialog`-Referenz.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		/** Wird per `bind:this` gesetzt; darüber steuert der Aufrufer `showModal()`/`close()`. */
		dialog: HTMLDialogElement | undefined;
		/** Id der Überschrift, auf die `aria-labelledby` zeigt. */
		titleId: string;
		title: string;
		children: Snippet;
		/** Die Buttonzeile am unteren Rand. */
		actions: Snippet;
		/**
		 * Lässt Dialoge mit mehr Inhalt (z.B. E-Mail-Vorschau) auf Desktop-Breakpoints breiter
		 * werden als den Standard-Bestätigungsdialog. Mobile bleibt unberührt (immer volle Breite
		 * als Bottom-Sheet).
		 */
		desktopMaxWidthClass?: string;
		/**
		 * `false` für Dialoge, die eine aktive Entscheidung erzwingen (z.B. Demo-/Live-Auswahl) —
		 * unterbindet das Schließen per Escape-Taste und Backdrop-Klick.
		 */
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

	/** Blockt das Schließen per Escape-Taste, wenn der Dialog nicht verwerfbar ist. */
	const oncancel = (event: Event) => {
		if (!dismissable) event.preventDefault();
	};

	/** Schließt den Dialog bei einem Klick auf den Backdrop. */
	const onBackdropClick = (event: MouseEvent) => {
		// Klicks auf den Inhalt haben ein Kindelement als target — nur der Backdrop trifft
		// das <dialog> selbst.
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
	<!-- overscroll-contain: am Ende der Dialog-Liste scrollt sonst die Seite dahinter weiter. -->
	<div class="overflow-y-auto overscroll-contain">
		<h3 id={titleId} class="text-lg font-semibold text-ink md:text-xl">{title}</h3>
		{@render children()}
	</div>
	<div class="mt-4 flex shrink-0 gap-2">{@render actions()}</div>
</dialog>
