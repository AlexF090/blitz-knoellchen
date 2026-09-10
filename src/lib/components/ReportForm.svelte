<script lang="ts">
	import { CITIES } from '$lib/config/cities';
	import { createProfileStore } from '$lib/profile/profileStore.svelte';
	import { validateReportForm, isFormValid, type ReportFormData } from '$lib/validation/formSchema';
	import { compressImage } from '$lib/image/compress';
	import { addEntry } from '$lib/history/db';
	import { parseExif } from '$lib/exif/parseExif';
	import { fetchAddress } from '$lib/geocode/client';

	const city = CITIES.koeln;
	const profileStore = createProfileStore();

	let photoInput: HTMLInputElement | undefined;
	let form = $state<ReportFormData>({
		firstName: profileStore.value.firstName,
		lastName: profileStore.value.lastName,
		address: profileStore.value.address,
		email: profileStore.value.email,
		date: '',
		time: '',
		locationAddress: '',
		incidentTypeId: '',
		licensePlate: '',
		notes: ''
	});
	let errors = $state<ReturnType<typeof validateReportForm>>({});
	let photoFile = $state<File | null>(null);
	let addressManualRequired = $state(false);
	let geocodeError = $state<string | null>(null);
	let sendError = $state<string | null>(null);
	let sendSuccess = $state(false);
	let submitting = $state(false);

	async function onPhotoSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		photoFile = file;
		geocodeError = null;
		addressManualRequired = false;

		const exif = await parseExif(file);

		if (exif.date) form.date = exif.date;
		if (exif.time) form.time = exif.time;

		if (exif.gps) {
			const address = await fetchAddress(exif.gps.lat, exif.gps.lon);
			if (address) {
				form.locationAddress = address;
			} else {
				geocodeError =
					'Adresse konnte nicht automatisch ermittelt werden — bitte manuell eintragen.';
				addressManualRequired = true;
				// GPS-Koordinaten als Fallback-Info mitschicken, auch wenn die Adresse manuell erfasst wird.
				const coordsNote = `GPS-Koordinaten des Fotos: ${exif.gps.lat}, ${exif.gps.lon}`;
				form.notes = form.notes ? `${form.notes}\n${coordsNote}` : coordsNote;
			}
		} else {
			addressManualRequired = true;
		}
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = validateReportForm(form);
		if (!isFormValid(errors) || !photoFile) return;

		submitting = true;
		sendError = null;

		try {
			const compressedPhoto = await compressImage(photoFile, { maxDimension: 1600, quality: 0.8 });
			const incidentType = city.incidentTypes.find((t) => t.id === form.incidentTypeId);

			const body = new FormData();
			body.set('firstName', form.firstName);
			body.set('lastName', form.lastName);
			body.set('address', form.address);
			body.set('email', form.email);
			body.set('date', form.date);
			body.set('time', form.time);
			body.set('locationAddress', form.locationAddress);
			body.set('incidentTypeId', form.incidentTypeId);
			body.set('licensePlate', form.licensePlate ?? '');
			body.set('notes', form.notes ?? '');
			body.set('photo', compressedPhoto, 'beweisfoto.jpg');

			const response = await fetch('/api/send', { method: 'POST', body });
			if (!response.ok) throw new Error('Versand fehlgeschlagen');

			profileStore.save({
				firstName: form.firstName,
				lastName: form.lastName,
				address: form.address,
				email: form.email
			});

			await addEntry({
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				firstName: form.firstName,
				lastName: form.lastName,
				locationAddress: form.locationAddress,
				incidentTypeLabel: incidentType?.label ?? form.incidentTypeId,
				licensePlate: form.licensePlate,
				notes: form.notes,
				thumbnail: compressedPhoto
			});

			sendSuccess = true;
			photoFile = null;
			if (photoInput) photoInput.value = '';
			form = { ...form, date: '', time: '', locationAddress: '', licensePlate: '', notes: '' };
		} catch {
			sendError =
				'Der Versand ist fehlgeschlagen. Deine Angaben bleiben erhalten — bitte erneut versuchen.';
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={onSubmit} class="flex flex-col gap-4">
	{#if sendSuccess}
		<p role="status" class="rounded bg-green-50 p-3 text-green-800">
			Anzeige erfolgreich versendet.
		</p>
	{/if}
	{#if sendError}
		<p role="alert" class="rounded bg-red-50 p-3 text-red-800">{sendError}</p>
	{/if}

	<div>
		<label for="photo" class="block text-sm font-medium">Beweisfoto</label>
		<input
			bind:this={photoInput}
			id="photo"
			type="file"
			accept="image/*"
			capture="environment"
			onchange={onPhotoSelected}
			class="mt-1 block w-full"
		/>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="firstName" class="block text-sm font-medium">Vorname</label>
			<input id="firstName" bind:value={form.firstName} class="mt-1 w-full rounded border p-2" />
			{#if errors.firstName}<p class="text-sm text-red-700">{errors.firstName}</p>{/if}
		</div>
		<div>
			<label for="lastName" class="block text-sm font-medium">Nachname</label>
			<input id="lastName" bind:value={form.lastName} class="mt-1 w-full rounded border p-2" />
			{#if errors.lastName}<p class="text-sm text-red-700">{errors.lastName}</p>{/if}
		</div>
	</div>

	<div>
		<label for="address" class="block text-sm font-medium">Deine Adresse</label>
		<input id="address" bind:value={form.address} class="mt-1 w-full rounded border p-2" />
		{#if errors.address}<p class="text-sm text-red-700">{errors.address}</p>{/if}
	</div>

	<div>
		<label for="email" class="block text-sm font-medium">Deine E-Mail-Adresse</label>
		<input id="email" type="email" bind:value={form.email} class="mt-1 w-full rounded border p-2" />
		{#if errors.email}<p class="text-sm text-red-700">{errors.email}</p>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="date" class="block text-sm font-medium">Datum</label>
			<input id="date" type="date" bind:value={form.date} class="mt-1 w-full rounded border p-2" />
			{#if errors.date}<p class="text-sm text-red-700">{errors.date}</p>{/if}
		</div>
		<div>
			<label for="time" class="block text-sm font-medium">Uhrzeit</label>
			<input id="time" type="time" bind:value={form.time} class="mt-1 w-full rounded border p-2" />
			{#if errors.time}<p class="text-sm text-red-700">{errors.time}</p>{/if}
		</div>
	</div>

	<div>
		<label for="locationAddress" class="block text-sm font-medium">Tatort-Adresse</label>
		<input
			id="locationAddress"
			bind:value={form.locationAddress}
			required={addressManualRequired}
			class="mt-1 w-full rounded border p-2"
		/>
		{#if geocodeError}<p class="text-sm text-amber-700">{geocodeError}</p>{/if}
		{#if errors.locationAddress}<p class="text-sm text-red-700">{errors.locationAddress}</p>{/if}
	</div>

	<div>
		<label for="incidentTypeId" class="block text-sm font-medium">Art des Verstoßes</label>
		<select
			id="incidentTypeId"
			bind:value={form.incidentTypeId}
			class="mt-1 w-full rounded border p-2"
		>
			<option value="">Bitte wählen</option>
			{#each city.incidentTypes as type (type.id)}
				<option value={type.id}>{type.label}</option>
			{/each}
		</select>
		{#if errors.incidentTypeId}<p class="text-sm text-red-700">{errors.incidentTypeId}</p>{/if}
	</div>

	<div>
		<label for="licensePlate" class="block text-sm font-medium">Kennzeichen (optional)</label>
		<input
			id="licensePlate"
			bind:value={form.licensePlate}
			class="mt-1 w-full rounded border p-2"
		/>
	</div>

	<div>
		<label for="notes" class="block text-sm font-medium">Weitere Angaben (optional)</label>
		<textarea id="notes" bind:value={form.notes} class="mt-1 w-full rounded border p-2"></textarea>
	</div>

	<button
		type="submit"
		disabled={submitting}
		class="rounded bg-blue-700 px-4 py-3 font-medium text-white disabled:opacity-50"
	>
		{submitting ? 'Wird gesendet…' : 'Absenden'}
	</button>
</form>
