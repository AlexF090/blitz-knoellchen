<script lang="ts">
	import { VEHICLE_MAKES } from '$lib/config/vehicleMakes';
	import { VEHICLE_TYPES } from '$lib/config/vehicleTypes';
	import { inputBase } from '$lib/ui/inputStyles';
	import { ariaFieldProps } from '$lib/validation/ariaField';
	import type { VehicleEntry, VehicleErrors } from '$lib/validation/formSchema';
	import { normalizeLicensePlate } from '$lib/validation/formSchema';
	import FormField from './FormField.svelte';

	interface Props {
		vehicle: VehicleEntry;
		errors?: VehicleErrors;
	}

	let { vehicle = $bindable(), errors }: Props = $props();

	/** Schreibt die Eingabe live groß — Kennzeichen bestehen international nur aus Großbuchstaben. */
	const onLicensePlateInput = (event: Event & { currentTarget: HTMLInputElement }) => {
		const input = event.currentTarget;
		const { selectionStart, selectionEnd } = input;
		const uppercased = input.value.toUpperCase();
		input.value = uppercased;
		// Das manuelle Setzen von `input.value` springt mit dem Cursor ans Ende. `toUpperCase()`
		// ändert die String-Länge nicht, daher lässt sich die alte Position unverändert setzen.
		input.setSelectionRange(selectionStart, selectionEnd);
		vehicle.licensePlate = uppercased;
	};

	/**
	 * Bringt das Kennzeichen beim Verlassen des Feldes ins kanonische Format ("K AB 1234" →
	 * "K-AB1234"). Dieselbe Normalisierung läuft beim Absenden noch einmal; hier dient sie nur
	 * dem sichtbaren Feedback.
	 */
	const onLicensePlateBlur = () => {
		vehicle.licensePlate = normalizeLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry);
	};
</script>

<fieldset class="mt-3 rounded-control border border-border p-3">
	<legend class="px-1 text-lg font-medium text-ink">Fahrzeug</legend>

	<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
		<FormField
			id="licensePlateCountry-{vehicle.id}"
			label="Länderkennz."
			bind:value={vehicle.licensePlateCountry}
		/>
		<FormField
			id="licensePlate-{vehicle.id}"
			label="Kennzeichen"
			required
			error={errors?.licensePlate}
		>
			{#snippet control()}
				<input
					id="licensePlate-{vehicle.id}"
					name="licensePlate-{vehicle.id}"
					value={vehicle.licensePlate}
					oninput={onLicensePlateInput}
					onblur={onLicensePlateBlur}
					required
					aria-required="true"
					autocapitalize="characters"
					spellcheck="false"
					{...ariaFieldProps(`licensePlate-${vehicle.id}`, errors?.licensePlate)}
					class={inputBase}
				/>
			{/snippet}
		</FormField>
	</div>

	<div class="mt-2">
		<FormField
			id="vehicleType-{vehicle.id}"
			label="Fahrzeugart"
			required
			error={errors?.vehicleType}
			wrapperClass=""
		>
			{#snippet control()}
				<select
					id="vehicleType-{vehicle.id}"
					name="vehicleType-{vehicle.id}"
					bind:value={vehicle.vehicleType}
					required
					aria-required="true"
					{...ariaFieldProps(`vehicleType-${vehicle.id}`, errors?.vehicleType)}
					class="{inputBase} bg-surface text-ink"
				>
					<option value="" disabled>Bitte wählen</option>
					{#each VEHICLE_TYPES as type (type)}<option value={type}>{type}</option>{/each}
				</select>
			{/snippet}
		</FormField>
	</div>

	<div class="mt-2 grid grid-cols-2 gap-3">
		<FormField
			id="make-{vehicle.id}"
			label="Marke"
			required
			error={errors?.make}
			list="vehicle-makes-{vehicle.id}"
			bind:value={vehicle.make}
		>
			{#snippet after()}
				<datalist id="vehicle-makes-{vehicle.id}">
					{#each VEHICLE_MAKES as make (make)}<option value={make}></option>{/each}
				</datalist>
			{/snippet}
		</FormField>
		<FormField
			id="color-{vehicle.id}"
			label="Farbe"
			required
			error={errors?.color}
			placeholder="z. B. Rot, hell, dunkel"
			bind:value={vehicle.color}
		/>
	</div>
	<p class="mt-1 text-base text-ink-muted">
		Genaue Farbe unbekannt? Auch Beschreibungen wie „hell" oder „dunkel" reichen aus.
	</p>
</fieldset>
