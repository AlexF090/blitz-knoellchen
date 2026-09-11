<script lang="ts">
	interface Props {
		title: string;
		linkHref: string;
		linkLabel: string;
	}

	let { title, linkHref, linkLabel }: Props = $props();
</script>

<div class="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
	<div
		class="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 md:max-w-3xl lg:max-w-5xl"
	>
		<h1 class="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- linkHref wird vom Aufrufer bereits per resolve() übergeben -->
		<a href={linkHref} class="text-sm text-primary-600 underline">{linkLabel}</a>
	</div>
</div>
