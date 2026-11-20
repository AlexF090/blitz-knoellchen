<script lang="ts">
	import { blobSrc } from './blobSrc';

	interface Props {
		blob: Blob;
	}

	const { blob }: Props = $props();
</script>

<img {@attach blobSrc(blob)} alt="Testbild" />
