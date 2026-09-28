<script lang="ts">
	import './layout.css';
	import { pwaAssetsHead } from 'virtual:pwa-assets/head';
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import AppModeDialog from '$lib/components/AppModeDialog.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import IosInstallBanner from '$lib/components/IosInstallBanner.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();

	const siteName = 'Blitz-Knöllchen';
	const description = 'Falschparker in rund 30 Sekunden an die Bußgeldstelle Köln melden.';
</script>

<svelte:head>
	<title>{siteName}</title>
	{#each pwaAssetsHead.links as link (link.href)}
		<link rel={link.rel} href={link.href} sizes={link.sizes} type={link.type} media={link.media} />
	{/each}
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="oklch(100% 0 0)" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="oklch(20% 0.004 173.48)" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="description" content={description} />
	<!-- Link-Vorschau in Messengern und sozialen Netzwerken. Crawler brauchen absolute URLs;
	     die Origin der Anfrage passt auch auf Preview-Deployments. -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="de_DE" />
	<meta property="og:title" content={siteName} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={`${page.url.origin}${page.url.pathname}`} />
	<meta property="og:image" content={`${page.url.origin}/og-image.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{siteName}: {description}" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<PullToRefresh>
	{@render children()}
</PullToRefresh>
<Footer />
<IosInstallBanner />
<InstallBanner />
<AppModeDialog />
