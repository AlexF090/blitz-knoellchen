<script lang="ts">
	interface Props {
		class?: string;
		'aria-hidden'?: 'true' | 'false';
	}

	let { class: className = '', 'aria-hidden': ariaHidden }: Props = $props();
</script>

<!-- StVO-Zeichen 286 (Parkverbot), Originaldatei von Wikimedia Commons (gemeinfrei/CC), lokal
     unter static/signs gehostet statt extern verlinkt (kein Netzwerk-Request beim Rendern). -->
<img
	src="/signs/zeichen-286-parkverbot.svg"
	alt="Verkehrszeichen 286 (Parkverbot)"
	aria-hidden={ariaHidden}
	class={className}
/>
