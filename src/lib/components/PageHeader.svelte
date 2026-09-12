<script lang="ts">
	import { ArrowLeft, History } from '@lucide/svelte';
	import LogoLockup from '$lib/components/branding/LogoLockup.svelte';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { buttonDestructive, buttonSecondary } from '$lib/ui/buttonStyles';
	import ConfirmDialog from './ConfirmDialog.svelte';

	interface Props {
		title: string;
		linkHref: string;
		linkLabel: string;
		linkIcon: 'history' | 'back';
		onResetConfirm?: () => void;
		logo?: boolean;
	}

	let { title, linkHref, linkLabel, linkIcon, onResetConfirm, logo = false }: Props = $props();

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
		triggerHaptic('warning');
		onResetConfirm?.();
	};

	const handleResetBackdropClick = (event: MouseEvent) => {
		if (event.target === resetDialog) resetDialog.close();
	};
</script>

<div
	class="sticky top-0 z-40 border-b border-surface/40 bg-surface/70 backdrop-blur-xl backdrop-saturate-150"
>
	<div
		class="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 md:max-w-3xl lg:max-w-5xl"
	>
		<h1 class="text-xl font-semibold tracking-tight text-ink md:text-2xl">
			{#if onResetConfirm}
				<button type="button" onclick={handleTitleTap} aria-label={title} class="-m-1 flex p-1">
					{#if logo}
						<LogoLockup />
					{:else}
						{title}
					{/if}
				</button>
			{:else if logo}
				<LogoLockup />
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
	<ConfirmDialog
		bind:dialog={resetDialog}
		onBackdropClick={handleResetBackdropClick}
		titleId="reset-form-dialog-title"
		title="Formular komplett zurücksetzen?"
	>
		<p class="mt-1 text-sm text-ink-muted">
			„Deine Angaben“, alle Fotos und Fahrzeuge/Vorgänge werden unwiderruflich gelöscht. Dein
			gespeichertes Profil bleibt für die nächste Anzeige erhalten.
		</p>
		{#snippet actions()}
			<button type="button" onclick={() => resetDialog?.close()} class="flex-1 {buttonSecondary}">
				Abbrechen
			</button>
			<button type="button" onclick={confirmReset} class="flex-1 {buttonDestructive}">
				Zurücksetzen
			</button>
		{/snippet}
	</ConfirmDialog>
{/if}
