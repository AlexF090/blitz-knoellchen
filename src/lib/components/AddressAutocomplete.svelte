<script lang="ts">
	import { fly } from 'svelte/transition';
	import { createAddressSuggestionsController } from '$lib/geocode/addressSuggestionsController';
	import type { AddressSuggestion } from '$lib/geocode/autocomplete';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { ariaFieldProps } from '$lib/validation/ariaField';

	interface Props {
		id: string;
		value: string;
		label: string;
		required?: boolean;
		autocompleteAttr?: string;
		placeholder?: string;
		error?: string;
		onSelect: (suggestion: AddressSuggestion) => void;
		onBlur?: () => void;
	}

	let {
		id,
		value = $bindable(),
		label,
		required = false,
		autocompleteAttr,
		placeholder,
		error,
		onSelect,
		onBlur
	}: Props = $props();

	let suggestions = $state<AddressSuggestion[]>([]);
	let open = $state(false);
	let activeIndex = $state(-1);
	let inputElement: HTMLInputElement | undefined;
	let containerElement: HTMLDivElement | undefined;

	const suggestionsController = createAddressSuggestionsController((result) => {
		suggestions = result;
		activeIndex = -1;
		open = result.length > 0;
	});

	let listboxId = $derived(`${id}-suggestions`);
	const optionId = (index: number) => `${id}-suggestion-${index}`;

	const closeList = () => {
		open = false;
		activeIndex = -1;
		suggestions = [];
		// Verwirft auch einen bereits laufenden Debounce/Fetch — sonst könnte dessen Antwort
		// die Liste nach einem Klick nach außen (oder Blur) unerwartet wieder öffnen.
		suggestionsController.cancel();
	};

	const scheduleSearch = () => suggestionsController.search(value);

	const selectSuggestion = (suggestion: AddressSuggestion) => {
		onSelect(suggestion);
		closeList();
		inputElement?.focus();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (!open || suggestions.length === 0) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = (activeIndex + 1) % suggestions.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
		} else if (event.key === 'Enter') {
			if (activeIndex >= 0) {
				event.preventDefault();
				selectSuggestion(suggestions[activeIndex]);
			}
		} else if (event.key === 'Escape') {
			closeList();
		}
	};

	const onDocumentClick = (event: MouseEvent) => {
		if (!containerElement?.contains(event.target as Node)) closeList();
	};

	const handleBlur = () => {
		// Tastatur-Tab ohne Auswahl schließt die Liste — ein Tap/Klick auf eine Option ist davon
		// unberührt, da dort onpointerdown preventDefault() das Blur-Event verhindert. pointerdown
		// statt mousedown, weil iOS Safari bei Touch sonst blur vor dem synthetisierten mousedown
		// auslösen kann — die Liste schließt sich dann, bevor die Auswahl verarbeitet wird.
		closeList();
		onBlur?.();
	};
</script>

<svelte:window onclick={onDocumentClick} />

<div class="relative min-w-0" bind:this={containerElement}>
	<label for={id} class="block text-lg font-medium text-ink"
		>{label}
		{#if required}<span class="text-error-fg">*</span>{/if}</label
	>
	<input
		{id}
		bind:this={inputElement}
		autocomplete={autocompleteAttr as HTMLInputElement['autocomplete']}
		{required}
		aria-required={required}
		role="combobox"
		aria-expanded={open}
		aria-controls={listboxId}
		aria-autocomplete="list"
		aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
		{placeholder}
		{...ariaFieldProps(id, error)}
		bind:value
		oninput={scheduleSearch}
		onkeydown={onKeydown}
		onblur={handleBlur}
		class="mt-1 w-full rounded-control border border-border p-2 text-lg"
	/>
	{#if error}<p id="{id}-error" role="alert" class="mt-1 text-lg text-error-fg">{error}</p>{/if}

	{#if open}
		<ul
			id={listboxId}
			role="listbox"
			in:fly={{ y: -4, duration: transitionDuration(150) }}
			class="absolute z-10 mt-1 w-full rounded-control border border-border bg-surface shadow-card"
		>
			{#each suggestions as suggestion, index (suggestion.label + index)}
				<li
					id={optionId(index)}
					role="option"
					aria-selected={index === activeIndex}
					class={`flex min-h-11 cursor-pointer items-center p-2 text-lg ${index === activeIndex ? 'bg-primary-50 text-primary-600' : 'text-ink'}`}
					onpointerdown={(event) => {
						event.preventDefault();
						selectSuggestion(suggestion);
					}}
					onmouseenter={() => (activeIndex = index)}
				>
					{suggestion.label}
				</li>
			{/each}
		</ul>
	{/if}
</div>
