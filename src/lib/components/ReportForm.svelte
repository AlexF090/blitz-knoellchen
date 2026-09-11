<script lang="ts">
	import { CITIES } from '$lib/config/cities';
	import { createProfileStore } from '$lib/profile/profileStore.svelte';
	import { validateReportForm, isFormValid, type ReportFormData } from '$lib/validation/formSchema';
	import { compressImage } from '$lib/image/compress';
	import { isHeicFile, convertHeicToJpeg } from '$lib/image/convertHeic';
	import { embedExifMetadata } from '$lib/image/embedExif';
	import { addEntry } from '$lib/history/db';
	import { parseExif, type ParsedExif } from '$lib/exif/parseExif';
	import { fetchAddress } from '$lib/geocode/client';
	import { formatAddress } from '$lib/geocode/formatAddress';

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
		locationStreet: '',
		locationHouseNumber: '',
		locationPostcode: '',
		locationCity: '',
		incidentTypeIds: [],
		licensePlate: '',
		notes: ''
	});
	let errors = $state<ReturnType<typeof validateReportForm>>({});
	let photoFile = $state<Blob | null>(null);
	let capturedExif = $state<ParsedExif | null>(null);
	let photoFileName = $state<string | null>(null);
	let converting = $state(false);
	let photoError = $state<string | null>(null);
	let addressManualRequired = $state(false);
	let geocodeError = $state<string | null>(null);
	let sendError = $state<string | null>(null);
	let sendSuccess = $state(false);
	let submitting = $state(false);

	function toggleIncidentType(id: string, checked: boolean) {
		form.incidentTypeIds = checked
			? [...form.incidentTypeIds, id]
			: form.incidentTypeIds.filter((existing) => existing !== id);
	}

	async function onPhotoSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		photoError = null;
		photoFile = null;
		photoFileName = file.name;
		geocodeError = null;
		addressManualRequired = false;

		const exif = await parseExif(file);
		capturedExif = exif;

		if (exif.date) form.date = exif.date;
		if (exif.time) form.time = exif.time;

		if (exif.gps) {
			const address = await fetchAddress(exif.gps.lat, exif.gps.lon);
			if (address?.street) form.locationStreet = address.street;
			if (address?.houseNumber) form.locationHouseNumber = address.houseNumber;
			if (address?.postcode) form.locationPostcode = address.postcode;
			if (address?.city) form.locationCity = address.city;

			if (!address?.street || !address?.city) {
				geocodeError =
					'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.';
				addressManualRequired = true;
				// GPS-Koordinaten als Fallback-Info mitschicken, auch wenn die Adresse manuell erfasst wird.
				const coordsNote = `GPS-Koordinaten des Fotos: ${exif.gps.lat}, ${exif.gps.lon}`;
				form.notes = form.notes ? `${form.notes}\n${coordsNote}` : coordsNote;
			}
		} else {
			addressManualRequired = true;
		}

		if (isHeicFile(file)) {
			converting = true;
			try {
				photoFile = await convertHeicToJpeg(file);
			} catch {
				photoError =
					'Dieses HEIC-Foto konnte nicht verarbeitet werden. Bitte ein JPEG/PNG-Foto wählen oder in den Kameraeinstellungen "Am kompatibelsten" aktivieren.';
			} finally {
				converting = false;
			}
		} else {
			photoFile = file;
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
			const photoWithExif = capturedExif
				? await embedExifMetadata(compressedPhoto, capturedExif)
				: compressedPhoto;
			const incidentTypes = city.incidentTypes.filter((t) => form.incidentTypeIds.includes(t.id));

			const body = new FormData();
			body.set('firstName', form.firstName);
			body.set('lastName', form.lastName);
			body.set('address', form.address);
			body.set('email', form.email);
			body.set('date', form.date);
			body.set('time', form.time);
			body.set('locationStreet', form.locationStreet);
			body.set('locationHouseNumber', form.locationHouseNumber ?? '');
			body.set('locationPostcode', form.locationPostcode);
			body.set('locationCity', form.locationCity);
			for (const id of form.incidentTypeIds) body.append('incidentTypeIds', id);
			body.set('licensePlate', form.licensePlate ?? '');
			body.set('notes', form.notes ?? '');
			body.set('photo', photoWithExif, 'beweisfoto.jpg');

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
				locationAddress: formatAddress({
					street: form.locationStreet,
					houseNumber: form.locationHouseNumber,
					postcode: form.locationPostcode,
					city: form.locationCity
				}),
				incidentTypeLabels: incidentTypes.map((t) => t.label),
				licensePlate: form.licensePlate,
				notes: form.notes,
				thumbnail: photoWithExif
			});

			sendSuccess = true;
			photoFile = null;
			photoFileName = null;
			capturedExif = null;
			if (photoInput) photoInput.value = '';
			form = {
				...form,
				date: '',
				time: '',
				locationStreet: '',
				locationHouseNumber: '',
				locationPostcode: '',
				locationCity: '',
				incidentTypeIds: [],
				licensePlate: '',
				notes: ''
			};
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
		<label
			for="photo"
			class="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-blue-700 px-4 py-3 text-center font-medium text-white hover:bg-blue-800"
		>
			{photoFileName ? 'Anderes Beweisfoto wählen' : 'Beweisfoto aufnehmen oder auswählen'}
		</label>
		<input
			bind:this={photoInput}
			id="photo"
			type="file"
			accept="image/*"
			capture="environment"
			onchange={onPhotoSelected}
			class="sr-only"
		/>
		{#if photoFileName}<p class="mt-1 text-sm text-gray-600">Ausgewählt: {photoFileName}</p>{/if}
		{#if converting}<p class="mt-1 text-sm text-gray-600">Foto wird konvertiert…</p>{/if}
		{#if photoError}<p class="mt-1 text-sm text-red-700">{photoError}</p>{/if}
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

	<div class="grid grid-cols-[2fr_1fr] gap-3">
		<div>
			<label for="locationStreet" class="block text-sm font-medium">Straße (Tatort)</label>
			<input
				id="locationStreet"
				bind:value={form.locationStreet}
				required={addressManualRequired}
				class="mt-1 w-full rounded border p-2"
			/>
			{#if errors.locationStreet}<p class="text-sm text-red-700">{errors.locationStreet}</p>{/if}
		</div>
		<div>
			<label for="locationHouseNumber" class="block text-sm font-medium">Hausnr.</label>
			<input
				id="locationHouseNumber"
				bind:value={form.locationHouseNumber}
				class="mt-1 w-full rounded border p-2"
			/>
		</div>
	</div>
	{#if geocodeError}<p class="text-sm text-amber-700">{geocodeError}</p>{/if}
	<div class="grid grid-cols-[1fr_2fr] gap-3">
		<div>
			<label for="locationPostcode" class="block text-sm font-medium">PLZ</label>
			<input
				id="locationPostcode"
				bind:value={form.locationPostcode}
				required={addressManualRequired}
				class="mt-1 w-full rounded border p-2"
			/>
			{#if errors.locationPostcode}<p class="text-sm text-red-700">
					{errors.locationPostcode}
				</p>{/if}
		</div>
		<div>
			<label for="locationCity" class="block text-sm font-medium">Ort (Tatort)</label>
			<input
				id="locationCity"
				bind:value={form.locationCity}
				required={addressManualRequired}
				class="mt-1 w-full rounded border p-2"
			/>
			{#if errors.locationCity}<p class="text-sm text-red-700">{errors.locationCity}</p>{/if}
		</div>
	</div>

	<fieldset>
		<legend class="block text-sm font-medium">Art des Verstoßes (Mehrfachauswahl möglich)</legend>
		<div class="mt-1 flex flex-col gap-2">
			{#each city.incidentTypes as type (type.id)}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.incidentTypeIds.includes(type.id)}
						onchange={(e) => toggleIncidentType(type.id, e.currentTarget.checked)}
						class="h-4 w-4 rounded border-gray-300"
					/>
					{type.label}
				</label>
			{/each}
		</div>
		{#if errors.incidentTypeIds}<p class="text-sm text-red-700">{errors.incidentTypeIds}</p>{/if}
	</fieldset>

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
		disabled={submitting || converting}
		class="rounded bg-blue-700 px-4 py-3 font-medium text-white disabled:opacity-50"
	>
		{submitting ? 'Wird gesendet…' : 'Absenden'}
	</button>
</form>
