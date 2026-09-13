<script lang="ts">
	import { ArrowLeft, History } from '@lucide/svelte';
	import { appMode } from '$lib/appMode.svelte';
	import LogoLockup from '$lib/components/branding/LogoLockup.svelte';

	interface Props {
		title: string;
		linkHref: string;
		linkLabel: string;
		linkIcon: 'history' | 'back';
		logo?: boolean;
	}

	let { title, linkHref, linkLabel, linkIcon, logo = false }: Props = $props();
</script>

<div
	class="sticky top-0 z-40 border-b border-surface/40 bg-surface/70 backdrop-blur-xl backdrop-saturate-150"
>
	<div
		class="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 md:max-w-3xl lg:max-w-5xl"
	>
		<div class="flex items-center gap-3">
			<h1 class="text-xl font-semibold tracking-tight text-ink md:text-2xl">
				{#if logo}
					<LogoLockup />
				{:else}
					{title}
				{/if}
			</h1>
			{#if appMode.current !== null}
				<button
					type="button"
					onclick={() => appMode.requestChange()}
					aria-label="Modus wechseln (aktuell {appMode.current === 'live' ? 'Live' : 'Demo'})"
					class="rounded-full border px-3 py-1 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 {appMode.current ===
					'live'
						? 'border-error-fg bg-error-bg text-error-fg'
						: 'border-border text-ink-muted'}"
				>
					{appMode.current === 'live' ? 'Live' : 'Demo'}
				</button>
			{/if}
		</div>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- linkHref wird vom Aufrufer bereits per resolve() übergeben -->
		<a
			href={linkHref}
			aria-label={linkLabel}
			title={linkLabel}
			class="flex size-11 items-center justify-center rounded-full text-primary-600 hover:bg-primary-500/10"
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
