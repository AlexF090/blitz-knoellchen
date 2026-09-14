<script lang="ts">
	interface Props {
		class?: string;
		'aria-hidden'?: 'true' | 'false';
	}

	let { class: className = '', 'aria-hidden': ariaHidden }: Props = $props();
</script>

<!-- StVO-Zeichen 283 (Halteverbot), Originaldatei von Wikimedia Commons (gemeinfrei/CC), lokal
     unter static/signs gehostet statt extern verlinkt (kein Netzwerk-Request beim Rendern). -->
<img
	src="/signs/zeichen-283-halteverbot.svg"
	alt="Verkehrszeichen 283 (Halteverbot)"
	aria-hidden={ariaHidden}
	class={className}
/>
