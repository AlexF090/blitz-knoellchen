<script lang="ts" generics="T extends string">
	interface Option<T> {
		value: T;
		label: string;
		ariaLabel: string;
	}

	interface Props {
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
			has-checked:bg-surface has-checked:text-primary-600 has-checked:shadow-card"
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
