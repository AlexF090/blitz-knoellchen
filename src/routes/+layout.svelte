<script lang="ts">
	import './layout.css';
	import { pwaAssetsHead } from 'virtual:pwa-assets/head';
	import { browser, dev } from '$app/env';
	import { page } from '$app/state';
	import { createVercelAnalytics } from '#lib/analytics/vercelAnalytics.ts';
	import AppModeDialog from '#lib/components/AppModeDialog.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import InstallBanner from '#lib/components/InstallBanner.svelte';
	import IosInstallBanner from '#lib/components/IosInstallBanner.svelte';
	import PullToRefresh from '#lib/components/PullToRefresh.svelte';
	import { buildPageMetadata } from '#lib/seo/pageMetadata.ts';
	import { buildStructuredDataElement } from '#lib/seo/structuredData.ts';

	// Nur im Production-Build: Das Skript liefert allein Vercel unter /_vercel aus, lokal gäbe es
	// einen 404.
	const trackPageview = createVercelAnalytics(browser && !dev);
	$effect(() => trackPageview(page.route.id, page.url.pathname));

	let { children } = $props();

	const siteName = 'Blitz-Knöllchen';
	const description = 'Falschparker in rund 30 Sekunden an die Bußgeldstelle Köln melden.';
	const metadata = $derived(buildPageMetadata(page.url.pathname));
	// Ein JSON-LD-Block ist ein Datenblock, kein ausführbares Skript: `script-src` der CSP gilt für
	// ihn nicht, er braucht weder Nonce noch Hash. buildStructuredDataElement maskiert `<`.
	const structuredDataElement = buildStructuredDataElement();
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
	<!-- Link-Vorschau in Messengern und sozialen Netzwerken. Crawler brauchen absolute URLs; sie
	     kommen aus der festen Produktionsdomain, nicht aus der Origin der Anfrage. -->
	<link rel="canonical" href={metadata.canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="de_DE" />
	<meta property="og:title" content={siteName} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={metadata.openGraphUrl} />
	<meta property="og:image" content={metadata.openGraphImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{siteName}: {description}" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- feste, selbst erzeugte Daten ohne Nutzereingabe -->
	{@html structuredDataElement}
</svelte:head>

<PullToRefresh>
	{@render children()}
</PullToRefresh>
<Footer />
<IosInstallBanner />
<InstallBanner />
<AppModeDialog />
