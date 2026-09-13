<script lang="ts">
	import './layout.css';
	import { pwaAssetsHead } from 'virtual:pwa-assets/head';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import AppModeDialog from '$lib/components/AppModeDialog.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import IosInstallBanner from '$lib/components/IosInstallBanner.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();
</script>

<svelte:head>
	<title>Blitz-Knöllchen</title>
	{#each pwaAssetsHead.links as link (link.href)}
		<link rel={link.rel} href={link.href} sizes={link.sizes} type={link.type} media={link.media} />
	{/each}
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
<AppModeDialog />
