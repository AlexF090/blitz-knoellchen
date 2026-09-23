<script lang="ts">
	/**
	 * Ein beschriftetes Eingabefeld mit Pflichtstern, ARIA-Verdrahtung und Fehlermeldung.
	 * Rendert standardmäßig ein `input`; Sonderfälle liefern ihr Control per Snippet.
	 */
	import type { Snippet } from 'svelte';
	import { fieldErrorBase, inputBase, labelBase, requiredMark } from '$lib/ui/inputStyles';
	import { ariaFieldProps } from '$lib/validation/ariaField';

	interface Props {
		/** Dient zugleich als `name` des Eingabefelds und als Basis der Fehler-Id. */
		id: string;
		label: string;
		/** Nur für das eingebaute `input` relevant; eigene Controls binden selbst. */
		value?: string;
		type?: string;
		required?: boolean;
		error?: string;
		list?: string;
		placeholder?: string;
		autocompleteAttr?: string;
		inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'decimal' | 'none';
		spellcheck?: boolean;
		onblur?: () => void;
		wrapperClass?: string;
		/**
		 * Escape-Hatch für Controls, die FormField nicht selbst abbildet (select/textarea,
		 * Sonderfälle wie licensePlate mit Cursor-Erhalt) — Label, Pflichtstern und Fehlertext
		 * kommen weiterhin von FormField, nur das Eingabeelement wird selbst gerendert.
		 */
		control?: Snippet;
		/** Für zusätzliches Markup zwischen Control und Fehlermeldung (z.B. `datalist`). */
		after?: Snippet;
	}

	let {
		id,
		label,
		// Bewusst ohne Fallback: optionale Felder (z.B. VehicleEntry.endTime) bleiben bis zur
		// ersten Eingabe `undefined`, und `$bindable('')` würde bei `bind:value={vehicle.endTime}`
		// mit `props_invalid_value` abstürzen („Cannot do bind:value={undefined} when value has a
		// fallback value“).
		value = $bindable(),
		type = 'text',
		required = false,
		error,
		list,
		placeholder,
		autocompleteAttr,
		inputmode,
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
			name={id}
			{type}
			{required}
			aria-required={required}
			{list}
			{placeholder}
			{inputmode}
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
