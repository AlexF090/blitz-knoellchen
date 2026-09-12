<script lang="ts">
	import { ArrowLeft, History } from '@lucide/svelte';

	interface Props {
		title: string;
		linkHref: string;
		linkLabel: string;
		linkIcon: 'history' | 'back';
		onResetConfirm?: () => void;
	}

	let { title, linkHref, linkLabel, linkIcon, onResetConfirm }: Props = $props();

	const TAP_RESET_THRESHOLD = 5;
	const TAP_TIMEOUT_MS = 1500;

	let tapCount = $state(0);
	let tapTimer: ReturnType<typeof setTimeout> | undefined;
	let resetDialog = $state<HTMLDialogElement | undefined>(undefined);

	const handleTitleTap = () => {
		tapCount += 1;
		clearTimeout(tapTimer);

		if (tapCount >= TAP_RESET_THRESHOLD) {
			tapCount = 0;
			resetDialog?.showModal();
			return;
		}

		tapTimer = setTimeout(() => (tapCount = 0), TAP_TIMEOUT_MS);
	};

	const confirmReset = () => {
		resetDialog?.close();
		onResetConfirm?.();
	};

	const handleResetBackdropClick = (event: MouseEvent) => {
		if (event.target === resetDialog) resetDialog.close();
	};
</script>

<div class="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
	<div
		class="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 md:max-w-3xl lg:max-w-5xl"
	>
		<h1 class="text-xl font-semibold text-ink md:text-2xl">
			{#if onResetConfirm}
				<button type="button" onclick={handleTitleTap} class="-m-1 p-1">{title}</button>
			{:else}
				{title}
			{/if}
		</h1>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- linkHref wird vom Aufrufer bereits per resolve() übergeben -->
		<a
			href={linkHref}
			aria-label={linkLabel}
			title={linkLabel}
			class="flex size-9 items-center justify-center rounded-full text-primary-600 hover:bg-primary-500/10"
		>
			{#if linkIcon === 'history'}
				<History class="size-5" aria-hidden="true" />
			{:else}
				<ArrowLeft class="size-5" aria-hidden="true" />
			{/if}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</div>

{#if onResetConfirm}
	<dialog
		bind:this={resetDialog}
		onclick={handleResetBackdropClick}
		aria-labelledby="reset-form-dialog-title"
		class="m-auto w-[90vw] max-w-sm rounded-card bg-surface p-4 shadow-card backdrop:bg-ink/70 sm:p-6"
	>
		<h3 id="reset-form-dialog-title" class="text-sm font-semibold text-ink">
			Formular komplett zurücksetzen?
		</h3>
		<p class="mt-1 text-sm text-ink-muted">
			„Deine Angaben“, alle Fotos und Fahrzeuge/Vorgänge werden unwiderruflich gelöscht. Dein
			gespeichertes Profil bleibt für die nächste Anzeige erhalten.
		</p>

		<div class="mt-4 flex gap-2">
			<button
				type="button"
				onclick={() => resetDialog?.close()}
				class="flex-1 rounded-control border border-primary-500 px-4 py-2.5 text-sm font-semibold text-primary-600"
			>
				Abbrechen
			</button>
			<button
				type="button"
				onclick={confirmReset}
				class="flex-1 rounded-control bg-error-fg px-4 py-3 text-sm font-semibold text-white"
			>
				Zurücksetzen
			</button>
		</div>
	</dialog>
{/if}
