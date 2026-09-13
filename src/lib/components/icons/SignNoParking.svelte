<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<!-- StVO-Zeichen 286 (Parkverbot), Originaldatei von Wikimedia Commons (gemeinfrei/CC), lokal
     unter static/signs gehostet statt extern verlinkt (kein Netzwerk-Request beim Rendern). -->
<img
	src="/signs/zeichen-286-parkverbot.svg"
	alt="Verkehrszeichen 286 (Parkverbot)"
	class={className}
/>
