<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 32 }: Props = $props();

	// Eindeutige ID pro Instanz — clipPath-IDs sind dokumentweit eindeutig referenziert,
	// eine feste ID würde bei mehreren gleichzeitig gerenderten BrandIcon-Instanzen kollidieren.
	const uid = $props.id();
	const clipId = `brand-icon-paper-cut-corner-${uid}`;
</script>

<!-- Feste Farbe (entspricht Primary-Token, Stufe 600, Light Mode, siehe app-icon.svg), kein
     Theme-Bezug — dieselbe Form, nur inline eingebettet statt als <img>, damit sie ohne
     zusätzlichen Netzwerk-Request in der Nav-Bar erscheint. -->
<svg
	width={size}
	height={size}
	viewBox="0 0 512 512"
	aria-hidden="true"
	class="shrink-0"
	xmlns="http://www.w3.org/2000/svg"
>
	<rect width="512" height="512" fill="#255a54" />
	<clipPath id={clipId}>
		<polygon points="97.75,97.75 376.27,97.75 414.25,135.73 414.25,414.25 97.75,414.25" />
	</clipPath>
	<g clip-path="url(#{clipId})">
		<rect x="97.75" y="97.75" width="316.51" height="316.51" fill="#f3f2f2" />
	</g>
	<polygon
		points="269.96,168.73 203.64,264.73 249.02,264.73 235.06,343.27 311.86,242.04 262.98,242.04"
		fill="#255a54"
	/>
</svg>
