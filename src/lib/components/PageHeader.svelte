<script lang="ts">
	import { ArrowLeft, History } from '@lucide/svelte';

	interface Props {
		title: string;
		linkHref: string;
		linkLabel: string;
		linkIcon: 'history' | 'back';
	}

	let { title, linkHref, linkLabel, linkIcon }: Props = $props();
</script>

<div class="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
	<div
		class="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 md:max-w-3xl lg:max-w-5xl"
	>
		<h1 class="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- linkHref wird vom Aufrufer bereits per resolve() übergeben -->
		<a
			href={linkHref}
			aria-label={linkLabel}
			title={linkLabel}
			class="flex h-9 w-9 items-center justify-center rounded-full text-primary-600 hover:bg-primary-500/10"
		>
			{#if linkIcon === 'history'}
				<History class="h-5 w-5" aria-hidden="true" />
			{:else}
				<ArrowLeft class="h-5 w-5" aria-hidden="true" />
			{/if}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</div>
