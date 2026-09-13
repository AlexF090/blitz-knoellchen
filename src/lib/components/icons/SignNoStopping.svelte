<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<!-- StVO-Zeichen 283 (Halteverbot), Originaldatei von Wikimedia Commons (gemeinfrei/CC), lokal
     unter static/signs gehostet statt extern verlinkt (kein Netzwerk-Request beim Rendern). -->
<img
	src="/signs/zeichen-283-halteverbot.svg"
	alt="Verkehrszeichen 283 (Halteverbot)"
	class={className}
/>
