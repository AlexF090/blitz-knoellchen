<script lang="ts">
	/**
	 * Der Tatort-Block einer Fahrzeug-Karte: Art der Zeitangabe, Zeitpunkt bzw. Zeitraum und die
	 * Adresse des Verstoßes.
	 */
	import { applyAddressSuggestion } from '$lib/geocode/applyAddressSuggestion';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import type { VehicleEntry, VehicleErrors } from '$lib/validation/formSchema';
	import AddressAutocomplete from './AddressAutocomplete.svelte';
	import FormField from './FormField.svelte';
	import SegmentedControl from './SegmentedControl.svelte';

	interface Props {
		vehicle: VehicleEntry;
		errors?: VehicleErrors;
		/** Hinweis, wenn sich der Tatort nicht vollständig aus dem Foto ableiten ließ. */
		geocodeWarning?: string;
	}

	let { vehicle = $bindable(), errors, geocodeWarning }: Props = $props();

	/** Schaltet zwischen Zeitraum (Parkverstoß) und Einzelzeitpunkt (Halteverstoß) um. */
	const selectTimeMode = (mode: string) => {
		if (mode === 'parkverstoss') {
			vehicle.timeMode = 'parkverstoss';
		} else {
			vehicle.timeMode = 'halteverstoss';
			// Der Halteverstoß kennt nur einen Zeitpunkt — eine zuvor eingetragene Endzeit bliebe
			// sonst unsichtbar im Datensatz stehen und tauchte in der E-Mail auf.
			vehicle.endTime = '';
		}
		triggerHaptic('selection');
	};
</script>

<fieldset class="mt-3 rounded-control border border-border p-3">
	<legend class="px-1 text-lg font-medium text-ink">Tatort</legend>

	<fieldset class="mt-2">
		<legend class="text-lg font-medium text-ink">Art der Zeitangabe</legend>
		<SegmentedControl
			name="timeMode-{vehicle.id}"
			value={vehicle.timeMode}
			onChange={selectTimeMode}
			options={[
				{
					value: 'halteverstoss',
					label: 'Halteverstoß',
					ariaLabel: 'Halteverstoß (Einzelzeitpunkt)'
				},
				{
					value: 'parkverstoss',
					label: 'Parkverstoß',
					ariaLabel: 'Parkverstoß (Zeitraum, mind. 4 Min.)'
				}
			]}
		/>
		{#if vehicle.timeMode === 'parkverstoss'}
			<p class="mt-1 text-base text-ink-muted">
				Für die Ahndung eines Parkverstoßes muss das Fahrzeug mindestens 4 Minuten durchgängig
				geparkt gewesen sein.
			</p>
		{/if}
	</fieldset>

	<div
		class={`mt-2 grid grid-cols-1 gap-3 ${vehicle.timeMode === 'parkverstoss' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
	>
		<FormField
			id="date-{vehicle.id}"
			label="Datum"
			type="date"
			required
			error={errors?.date}
			bind:value={vehicle.date}
		/>
		<FormField
			id="time-{vehicle.id}"
			label={vehicle.timeMode === 'parkverstoss' ? 'Von' : 'Uhrzeit'}
			type="time"
			required
			error={errors?.time}
			bind:value={vehicle.time}
		/>
		{#if vehicle.timeMode === 'parkverstoss'}
			<FormField
				id="endTime-{vehicle.id}"
				label="Bis"
				type="time"
				required
				error={errors?.endTime}
				bind:value={vehicle.endTime}
			/>
		{/if}
	</div>
	<div class="mt-2 grid grid-cols-[2fr_1fr] gap-3">
		<AddressAutocomplete
			id="locationStreet-{vehicle.id}"
			label="Straße"
			required
			error={errors?.locationStreet}
			bind:value={vehicle.locationStreet}
			onSelect={(suggestion) => applyAddressSuggestion(vehicle, suggestion, true)}
		/>
		<FormField
			id="locationHouseNumber-{vehicle.id}"
			label="Hausnr."
			bind:value={vehicle.locationHouseNumber}
		/>
	</div>
	{#if geocodeWarning}<p role="status" class="mt-1 text-lg text-warning-fg">
			{geocodeWarning}
		</p>{/if}
	<div class="mt-2 grid grid-cols-[1fr_2fr] gap-3">
		<FormField
			id="locationPostcode-{vehicle.id}"
			label="PLZ"
			required
			inputmode="numeric"
			error={errors?.locationPostcode}
			bind:value={vehicle.locationPostcode}
		/>
		<FormField
			id="locationCity-{vehicle.id}"
			label="Ort"
			required
			error={errors?.locationCity}
			bind:value={vehicle.locationCity}
		/>
	</div>
</fieldset>
