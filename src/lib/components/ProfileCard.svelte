<script lang="ts">
	/**
	 * Die Karte „Deine Angaben“ — Name, Anschrift und Kontaktdaten des Anzeigenden, wahlweise im
	 * Bearbeiten- oder im Lese-Modus.
	 */
	import { buttonPrimary, buttonSecondary } from '$lib/ui/buttonStyles';
	import { onEnterKey } from '$lib/ui/onEnterKey';
	import type { FormErrors, ReportFormData } from '$lib/validation/formSchema';
	import { validateProfileFields } from '$lib/validation/formSchema';
	import AddressAutocomplete from './AddressAutocomplete.svelte';
	import FormField from './FormField.svelte';

	interface Props {
		form: ReportFormData;
		errors: FormErrors;
		/** Umschalter zwischen Bearbeiten- und Lese-Modus. */
		isEditing: boolean;
		/**
		 * Schreibt die Felder ins dauerhafte Profil (IndexedDB) — liegt beim Aufrufer, weil das
		 * Absenden dieselbe Persistenz ohne den Umweg über diese Karte braucht.
		 */
		onPersist: () => Promise<void>;
	}

	let {
		form = $bindable(),
		errors = $bindable(),
		isEditing = $bindable(),
		onPersist
	}: Props = $props();

	/** Validiert die Profilfelder und wechselt nur bei fehlerfreier Eingabe in den Lese-Modus. */
	const onSave = async () => {
		const profileErrors = validateProfileFields(form);
		errors = { ...errors, ...profileErrors };
		if (Object.keys(profileErrors).length > 0) return;

		await onPersist();
		isEditing = false;
	};

	/**
	 * Speichert das Profil bei Enter. Ohne diesen Handler würde Enter die gesamte Anzeige
	 * abschicken — die Felder liegen im selben `form`-Element wie der Absenden-Button der Seite.
	 */
	const onFieldKeydown = onEnterKey(() => void onSave());
</script>

<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
	<h2 class="text-lg font-semibold text-ink md:text-xl">Deine Angaben</h2>

	{#if isEditing}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div onkeydown={onFieldKeydown}>
			<p class="mt-1 text-lg text-ink-muted">
				Mit <span class="text-error-fg">*</span> markierte Felder sind Pflichtfelder.
			</p>

			<div class="mt-3 grid grid-cols-2 gap-3">
				<FormField
					id="firstName"
					label="Vorname"
					required
					autocompleteAttr="given-name"
					error={errors.firstName}
					bind:value={form.firstName}
					onblur={onPersist}
				/>
				<FormField
					id="lastName"
					label="Nachname"
					required
					autocompleteAttr="family-name"
					error={errors.lastName}
					bind:value={form.lastName}
					onblur={onPersist}
				/>
			</div>

			<div class="mt-3">
				<AddressAutocomplete
					id="addressStreet"
					label="Straße und Hausnr."
					required
					autocompleteAttr="address-line1"
					placeholder="z. B. Musterstraße 12"
					error={errors.addressStreet}
					bind:value={form.addressStreet}
					onBlur={onPersist}
					onSelect={(suggestion) => {
						form.addressStreet = [suggestion.street, suggestion.houseNumber]
							.filter(Boolean)
							.join(' ');
						if (suggestion.postcode) form.addressPostcode = suggestion.postcode;
						if (suggestion.city) form.addressCity = suggestion.city;
					}}
				/>
			</div>

			<div class="mt-3 grid grid-cols-[1fr_2fr] gap-3">
				<FormField
					id="addressPostcode"
					label="PLZ"
					required
					inputmode="numeric"
					autocompleteAttr="postal-code"
					error={errors.addressPostcode}
					bind:value={form.addressPostcode}
					onblur={onPersist}
				/>
				<FormField
					id="addressCity"
					label="Ort"
					required
					autocompleteAttr="address-level2"
					error={errors.addressCity}
					bind:value={form.addressCity}
					onblur={onPersist}
				/>
			</div>

			<div class="mt-3">
				<FormField
					id="email"
					label="Deine E-Mail-Adresse"
					type="email"
					required
					autocompleteAttr="email"
					spellcheck={false}
					error={errors.email}
					bind:value={form.email}
					onblur={onPersist}
				/>
			</div>

			<div class="mt-3">
				<FormField
					id="phone"
					label="Telefonnummer"
					type="tel"
					autocompleteAttr="tel"
					placeholder="z. B. 0221 12345678"
					bind:value={form.phone}
					onblur={onPersist}
				/>
			</div>

			<button type="button" onclick={onSave} class="mt-4 ml-auto block {buttonPrimary}">
				Speichern
			</button>
		</div>
	{:else}
		<div class="mt-3 text-lg text-ink">
			<p>{form.firstName} {form.lastName}</p>
			<p>{form.addressStreet}</p>
			<p>{form.addressPostcode} {form.addressCity}</p>
			<p>{form.email}</p>
			{#if form.phone}<p>{form.phone}</p>{/if}
		</div>

		<button
			type="button"
			onclick={() => (isEditing = true)}
			class="mt-4 ml-auto block {buttonSecondary}"
		>
			Bearbeiten
		</button>
	{/if}
</div>
