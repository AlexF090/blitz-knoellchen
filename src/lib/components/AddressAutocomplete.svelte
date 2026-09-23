<script lang="ts">
	/**
	 * Adressfeld mit Vorschlagsliste (ARIA-Combobox): tippen, per Pfeiltasten oder Tap auswählen.
	 * Die Suche selbst liegt im addressSuggestionsController.
	 */
	import { fly } from 'svelte/transition';
	import { createAddressSuggestionsController } from '$lib/geocode/addressSuggestionsController';
	import type { AddressSuggestion } from '$lib/geocode/autocomplete';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { inputBase } from '$lib/ui/inputStyles';
	import { ariaFieldProps } from '$lib/validation/ariaField';
	import FormField from './FormField.svelte';

	interface Props {
		id: string;
		value: string;
		label: string;
		required?: boolean;
		autocompleteAttr?: string;
		placeholder?: string;
		error?: string;
		/** Übernimmt einen ausgewählten Vorschlag — auch PLZ und Ort liegen darin. */
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
	let searchFailed = $state(false);
	let inputElement: HTMLInputElement | undefined;
	let containerElement: HTMLDivElement | undefined;

	const suggestionsController = createAddressSuggestionsController((result, failed) => {
		suggestions = result;
		searchFailed = failed;
		activeIndex = -1;
		open = result.length > 0;
	});

	let listboxId = $derived(`${id}-suggestions`);
	/** Id einer Option, auf die `aria-activedescendant` zeigen kann. */
	const optionId = (index: number) => `${id}-suggestion-${index}`;

	/** Schließt die Vorschlagsliste und verwirft ihren gesamten Zustand. */
	const closeList = () => {
		open = false;
		activeIndex = -1;
		suggestions = [];
		searchFailed = false;
		// Verwirft auch einen bereits laufenden Debounce/Fetch — sonst könnte dessen Antwort
		// die Liste nach einem Klick nach außen (oder Blur) unerwartet wieder öffnen.
		suggestionsController.cancel();
	};

	/** Stößt die (intern entprellte) Suche zum aktuellen Eingabetext an. */
	const scheduleSearch = () => suggestionsController.search(value);

	/** Übernimmt einen Vorschlag und gibt den Fokus zurück ins Eingabefeld. */
	const selectSuggestion = (suggestion: AddressSuggestion) => {
		onSelect(suggestion);
		closeList();
		inputElement?.focus();
	};

	/** Tastaturbedienung der Liste: Pfeile (umlaufend), Enter übernimmt, Escape schließt. */
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

	/** Schließt die Liste bei einem Klick außerhalb der Komponente. */
	const onDocumentClick = (event: MouseEvent) => {
		if (!containerElement?.contains(event.target as Node)) closeList();
	};

	/**
	 * Schließt die Liste, wenn das Feld ohne Auswahl verlassen wird (z.B. per Tab).
	 * Ein Tap/Klick auf eine Option bleibt davon unberührt: deren `onpointerdown` verhindert per
	 * preventDefault() das Blur-Event. Bewusst pointerdown statt mousedown — iOS Safari kann bei
	 * Touch sonst blur vor dem synthetisierten mousedown auslösen und die Liste schließen, bevor
	 * die Auswahl verarbeitet ist.
	 */
	const handleBlur = () => {
		closeList();
		onBlur?.();
	};
</script>

<svelte:window onclick={onDocumentClick} />

<div bind:this={containerElement}>
	<FormField {id} {label} {required} {error} wrapperClass="relative min-w-0">
		{#snippet control()}
			<input
				{id}
				name={id}
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
				class={inputBase}
			/>
		{/snippet}
		{#snippet after()}
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
			{#if searchFailed}
				<p role="status" class="mt-1 text-lg text-warning-fg">
					Adressvorschläge aktuell nicht verfügbar — bitte manuell eingeben.
				</p>
			{/if}
		{/snippet}
	</FormField>
</div>
