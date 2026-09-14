<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fieldErrorBase, inputBase, labelBase, requiredMark } from '$lib/ui/inputStyles';
	import { ariaFieldProps } from '$lib/validation/ariaField';

	interface Props {
		id: string;
		label: string;
		value?: string;
		type?: string;
		required?: boolean;
		error?: string;
		list?: string;
		placeholder?: string;
		autocompleteAttr?: string;
		spellcheck?: boolean;
		onblur?: () => void;
		wrapperClass?: string;
		// Escape-Hatch für Controls, die FormField nicht selbst abbildet (select/textarea,
		// Sonderfälle wie licensePlate mit Cursor-Erhalt) — Label/Pflichtstern/Fehler-<p> kommen
		// weiterhin von FormField, nur das eigentliche Eingabeelement wird selbst gerendert.
		control?: Snippet;
		// Für zusätzliches Markup zwischen Control und Fehlermeldung (z.B. <datalist>).
		after?: Snippet;
	}

	let {
		id,
		label,
		// Kein Default-Fallback hier: einige Felder (z.B. VehicleEntry.endTime) sind bewusst nur
		// optional und bleiben bis zur ersten Eingabe `undefined` — ein `$bindable('')` würde bei
		// `bind:value={vehicle.endTime}` mit `props_invalid_value` abstürzen ("Cannot do
		// bind:value={undefined} when value has a fallback value").
		value = $bindable(),
		type = 'text',
		required = false,
		error,
		list,
		placeholder,
		autocompleteAttr,
		spellcheck,
		onblur,
		wrapperClass = 'min-w-0',
		control,
		after
	}: Props = $props();
</script>

<div class={wrapperClass}>
	<label for={id} class={labelBase}
		>{label}
		{#if required}<span class={requiredMark}>*</span>{/if}</label
	>
	{#if control}
		{@render control()}
	{:else}
		<input
			{id}
			{type}
			{required}
			aria-required={required}
			{list}
			{placeholder}
			{spellcheck}
			autocomplete={autocompleteAttr as HTMLInputElement['autocomplete']}
			{...ariaFieldProps(id, error)}
			{value}
			oninput={(event) => (value = event.currentTarget.value)}
			{onblur}
			class={inputBase}
		/>
	{/if}
	{@render after?.()}
	{#if error}<p id="{id}-error" role="alert" class={fieldErrorBase}>{error}</p>{/if}
</div>
