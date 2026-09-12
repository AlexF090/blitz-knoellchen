<script lang="ts">
	// Self-hosted statt Google-Fonts-CDN (fonts.googleapis.com) — ein direkter CDN-Aufruf würde
	// Nutzer-IPs an Google übertragen, DSGVO-Abmahnrisiko (vgl. LG München I, 20.01.2022).
	// Nur Gewicht 800 geladen, wie im Original-Design, und nur hier importiert statt global in
	// layout.css, da Archivo ausschließlich für die Wortmarke genutzt wird (Rest der App bleibt
	// bei der System-Font, s. CLAUDE.md "Apple Design beibehalten").
	import '@fontsource/archivo/800.css';

	interface Props {
		size?: 'sm' | 'lg';
	}

	let { size = 'sm' }: Props = $props();
</script>

<span
	class="flex flex-col items-start text-left leading-[0.95] font-[800] tracking-[-0.02em]"
	class:text-base={size === 'sm'}
	class:text-3xl={size === 'lg'}
	style="font-family: 'Archivo', sans-serif;"
>
	<span class="text-ink">BLITZ</span>
	<span class="text-primary-600">KNÖLLCHEN</span>
</span>
