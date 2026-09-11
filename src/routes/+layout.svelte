<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import IosInstallBanner from '$lib/components/IosInstallBanner.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Blitz-Knöllchen</title>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
	<meta name="theme-color" content="oklch(97.48% 0.0028 128.49)" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta
		name="description"
		content="Falschparker in unter 30 Sekunden an die Bußgeldstelle Köln melden."
	/>
</svelte:head>

{@render children()}
<Footer />
<IosInstallBanner />
