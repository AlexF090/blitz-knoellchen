<script lang="ts" generics="T extends string">
	/**
	 * Eine Reihe sich gegenseitig ausschließender Optionen im iOS-Stil — technisch verdeckte
	 * Radio-Buttons, damit Tastatur und Screenreader die Gruppe normal bedienen können.
	 */
	interface Option<T> {
		value: T;
		label: string;
		/** Ausführliche Beschriftung für Screenreader, z.B. mit der Bedeutung der Option. */
		ariaLabel: string;
	}

	interface Props {
		/** Gemeinsamer Radio-Gruppenname; muss pro Instanz auf der Seite eindeutig sein. */
		name: string;
		value: T;
		options: Option<T>[];
		onChange: (value: T) => void;
	}

	let { name, value, options, onChange }: Props = $props();
</script>

<div class="mt-1 inline-flex w-full rounded-control bg-surface-sunken p-1">
	{#each options as option (option.value)}
		<label
			class="relative flex-1 cursor-pointer rounded-[calc(var(--radius-control)-0.25rem)] px-3
			py-3 text-center text-lg font-medium text-ink-muted transition-colors
			has-checked:bg-surface has-checked:text-primary-600 has-checked:shadow-card
			has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2
			has-focus-visible:outline-primary-600"
		>
			<input
				type="radio"
				{name}
				aria-label={option.ariaLabel}
				checked={value === option.value}
				onchange={() => onChange(option.value)}
				class="absolute inset-0 size-full cursor-pointer opacity-0"
			/>
			{option.label}
		</label>
	{/each}
</div>
