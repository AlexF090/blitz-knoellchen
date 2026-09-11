<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer
	class="mt-8 border-t border-border pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-xs text-ink-muted"
>
	<p>
		<a href={resolve('/datenschutz')} class="inline-block px-2 py-2 underline">Datenschutz</a>
	</p>
	<p class="mt-1">v{__APP_VERSION__}</p>
</footer>
