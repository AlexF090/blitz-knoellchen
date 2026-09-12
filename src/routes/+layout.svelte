<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import IosInstallBanner from '$lib/components/IosInstallBanner.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Blitz-Knöllchen</title>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="oklch(100% 0 0)" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="oklch(20% 0.004 173.48)" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta
		name="description"
		content="Falschparker in unter 30 Sekunden an die Bußgeldstelle Köln melden."
	/>
</svelte:head>

<PullToRefresh>
	{@render children()}
</PullToRefresh>
<Footer />
<IosInstallBanner />
<InstallBanner />
