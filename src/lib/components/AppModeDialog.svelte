<script lang="ts">
	import { appMode } from '$lib/appMode.svelte';
	import { buttonDestructiveSecondary, buttonPrimary } from '$lib/ui/buttonStyles';
	import ConfirmDialog from './ConfirmDialog.svelte';

	let dialog = $state<HTMLDialogElement | undefined>(undefined);

	// Kein `$state`, nur ein Einmal-Schalter innerhalb des Effekts: verhindert, dass ein späteres
	// appMode.requestChange() (Klick auf das Modus-Badge im Header) den zuletzt gewählten Wert
	// sofort wieder aus sessionStorage nachlädt, statt den Dialog tatsächlich erneut zu öffnen.
	let restoredFromStorage = false;

	// Die Wahl gilt pro sessionStorage-Session (überlebt Reload, verschwindet mit dem Tab) statt
	// bei jedem Reload neu erzwungen zu werden — kein Schließen ohne Klick auf einen der beiden
	// Buttons. `browser` ist hier nicht nötig: der Effekt läuft ohnehin nur clientseitig nach dem
	// Mount.
	$effect(() => {
		if (appMode.current === null) {
			if (!restoredFromStorage) {
				restoredFromStorage = true;
				appMode.restore();
			}
			if (appMode.current === null) dialog?.showModal();
		}
	});

	const choose = (value: 'demo' | 'live') => {
		appMode.set(value);
		dialog?.close();
	};
</script>

<ConfirmDialog
	bind:dialog
	dismissable={false}
	titleId="app-mode-dialog-title"
	title="Demo- oder Live-Modus?"
	desktopMaxWidthClass="sm:max-w-lg"
>
	<p class="mt-1 text-lg text-ink-muted">
		Blitz-Knöllchen befindet sich noch in der Entwicklung und ist nicht vollständig getestet. Im
		<strong class="text-ink">Demo-Modus</strong> geht jede Anzeige nur an eine interne Test-Adresse.
		Im <strong class="text-ink">Live-Modus</strong> wird die Anzeige tatsächlich an die Bußgeldstelle
		Köln versendet.
	</p>
	{#snippet actions()}
		<button type="button" onclick={() => choose('demo')} class="flex-1 {buttonPrimary}">
			Demo verwenden
		</button>
		<button
			type="button"
			onclick={() => choose('live')}
			class="flex-1 {buttonDestructiveSecondary}"
		>
			Live verwenden
		</button>
	{/snippet}
</ConfirmDialog>
