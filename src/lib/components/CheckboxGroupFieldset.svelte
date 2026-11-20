<script lang="ts">
	/**
	 * Eine Mehrfachauswahl als Checkbox-Gruppe mit Legende, Hinweis und Fehlermeldung. Die
	 * Fieldset-Id ist fokussierbar, damit nach einem Validierungsfehler dorthin gesprungen wird.
	 */
	import type { ImpactOption } from '$lib/config/impactOptions';
	import type { OptionIconMap } from '$lib/config/optionIcon';
	import OptionIcon from './OptionIcon.svelte';
	import { fieldErrorBase } from '$lib/ui/inputStyles';
	import { toggleId } from '$lib/validation/toggleId';

	interface Props {
		legend: string;
		hint?: string;
		options: ImpactOption[];
		selectedIds: string[];
		/** Basis für Fieldset-Id und Fehler-Id; muss zum Schlüssel in `fieldOrder.ts` passen. */
		idPrefix: string;
		error?: string;
		/** Optionales Orientierungs-Icon je Options-id. */
		icons?: OptionIconMap;
	}

	let {
		legend,
		hint,
		options,
		selectedIds = $bindable(),
		idPrefix,
		error,
		icons = {}
	}: Props = $props();

	const describedBy = $derived(
		[hint ? `${idPrefix}-hint` : undefined, error ? `${idPrefix}-error` : undefined]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<fieldset
	id={idPrefix}
	tabindex="-1"
	aria-describedby={describedBy}
	class="mt-3 rounded-control border border-border p-3"
>
	<legend class="px-1 text-lg font-medium text-ink">{legend}</legend>
	{#if hint}<p id="{idPrefix}-hint" class="text-base text-ink-muted">{hint}</p>{/if}
	<div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each options as option (option.id)}
			{@const icon = icons[option.id]}
			<label class="flex cursor-pointer items-center gap-2 py-2.5 text-lg text-ink">
				<input
					type="checkbox"
					checked={selectedIds.includes(option.id)}
					onchange={(event) =>
						(selectedIds = toggleId(selectedIds, option.id, event.currentTarget.checked))}
					class="size-4 shrink-0 rounded border-border"
				/>
				{#if icon}<OptionIcon {icon} />{/if}
				{option.label}
			</label>
		{/each}
	</div>
	{#if error}<p id="{idPrefix}-error" role="alert" class={fieldErrorBase}>{error}</p>{/if}
</fieldset>
