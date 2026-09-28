<script lang="ts">
	/**
	 * Wahl zwischen Live- und Demo-Modus. Öffnet sich, wenn der Modus über das Header-Badge
	 * gewechselt werden soll; beim Start läuft die App ohne Rückfrage im Live-Modus.
	 */
	import { onMount } from 'svelte';
	import { appMode } from '$lib/appMode.svelte';
	import { buttonDestructiveSecondary, buttonPrimary } from '$lib/ui/buttonStyles';
	import ConfirmDialog from './ConfirmDialog.svelte';

	let dialog = $state<HTMLDialogElement | undefined>(undefined);

	// Ein Wechsel zu Demo gilt pro sessionStorage-Session (überlebt Reload, verschwindet mit dem
	// Tab). onMount läuft nur clientseitig, sessionStorage ist dort verfügbar.
	onMount(() => appMode.restore());

	$effect(() => {
		if (!dialog) return;
		if (appMode.isChangeRequested && !dialog.open) dialog.showModal();
		if (!appMode.isChangeRequested && dialog.open) dialog.close();
	});

	/** Escape und Backdrop-Klick schließen den Dialog nativ; der Store muss das mitbekommen. */
	const onclose = () => appMode.cancelChange();
</script>

<ConfirmDialog
	bind:dialog
	{onclose}
	titleId="app-mode-dialog-title"
	title="Live- oder Demo-Modus?"
	desktopMaxWidthClass="sm:max-w-lg"
>
	<p class="mt-1 text-lg text-ink-muted">
		Im <strong class="text-ink">Live-Modus</strong> wird die Anzeige an die Bußgeldstelle Köln
		versendet. Im <strong class="text-ink">Demo-Modus</strong> geht sie nur an eine Test-Adresse – zum
		gefahrlosen Ausprobieren.
	</p>
	{#snippet actions()}
		<button type="button" onclick={() => appMode.set('demo')} class="flex-1 {buttonPrimary}">
			Demo verwenden
		</button>
		<button
			type="button"
			onclick={() => appMode.set('live')}
			class="flex-1 {buttonDestructiveSecondary}"
		>
			Live verwenden
		</button>
	{/snippet}
</ConfirmDialog>
