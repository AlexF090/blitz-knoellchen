<script lang="ts">
	import { tick } from 'svelte';
	import { CITIES } from '$lib/config/cities';
	import { createProfileStore } from '$lib/profile/profileStore.svelte';
	import {
		validateReportForm,
		isFormValid,
		MAX_PHOTOS_PER_REPORT,
		type PhotoEntry,
		type ReportFormData,
		type VehicleEntry
	} from '$lib/validation/formSchema';
	import { compressImage } from '$lib/image/compress';
	import { isHeicFile, convertHeicToJpeg } from '$lib/image/convertHeic';
	import { embedExifMetadata } from '$lib/image/embedExif';
	import { addEntry } from '$lib/history/db';
	import { parseExif } from '$lib/exif/parseExif';
	import { fetchAddress } from '$lib/geocode/client';
	import { formatAddress } from '$lib/geocode/formatAddress';
	import PhotoPool from './PhotoPool.svelte';
	import VehicleBlock from './VehicleBlock.svelte';

	const city = CITIES.koeln;
	const profileStore = createProfileStore();

	const makeEmptyVehicle = (): VehicleEntry => ({
		id: crypto.randomUUID(),
		photoIds: [],
		licensePlate: '',
		incidentTypeIds: [],
		notes: ''
	});

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
		photos: [],
		vehicles: [makeEmptyVehicle()]
	});
	let errors = $state<ReturnType<typeof validateReportForm>>({});
	let photosCardElement = $state<HTMLDivElement | undefined>(undefined);
	let photoProcessing = $state(false);
	let photoProcessingError = $state<string | null>(null);
	let addressManualRequired = $state(false);
	let geocodeError = $state<string | null>(null);
	let sendError = $state<string | null>(null);
	let sendResults = $state<{ licensePlate: string; ok: boolean }[]>([]);
	let submitting = $state(false);

	let usageCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const vehicle of form.vehicles) {
			for (const photoId of vehicle.photoIds) counts[photoId] = (counts[photoId] ?? 0) + 1;
		}
		return counts;
	});

	const onAddPhoto = async (file: File) => {
		photoProcessingError = null;
		const isFirstPhoto = form.photos.length === 0;
		const exif = await parseExif(file);

		if (isFirstPhoto) {
			geocodeError = null;
			addressManualRequired = false;

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
					for (const vehicle of form.vehicles) {
						vehicle.notes = vehicle.notes ? `${vehicle.notes}\n${coordsNote}` : coordsNote;
					}
				}
			} else {
				addressManualRequired = true;
			}
		}

		photoProcessing = true;
		try {
			let rawBlob: Blob = file;
			if (isHeicFile(file)) {
				try {
					rawBlob = await convertHeicToJpeg(file);
				} catch {
					photoProcessingError =
						'Dieses HEIC-Foto konnte nicht verarbeitet werden. Bitte ein JPEG/PNG-Foto wählen oder in den Kameraeinstellungen "Am kompatibelsten" aktivieren.';
					return;
				}
			}

			const compressed = await compressImage(rawBlob, { maxDimension: 1600, quality: 0.8 });
			const withExif = await embedExifMetadata(compressed, exif);

			const entry: PhotoEntry = { id: crypto.randomUUID(), blob: withExif, fileName: file.name };
			form.photos = [...form.photos, entry];
			errors = { ...errors, photos: undefined };

			// Bei genau einem Fahrzeug ist die Zuordnung eindeutig — direkt automatisch übernehmen.
			if (form.vehicles.length === 1 && form.vehicles[0].photoIds.length < MAX_PHOTOS_PER_REPORT) {
				form.vehicles[0].photoIds = [...form.vehicles[0].photoIds, entry.id];
			}
		} finally {
			photoProcessing = false;
		}
	};

	const onRemovePhoto = (photoId: string) => {
		form.photos = form.photos.filter((photo) => photo.id !== photoId);
		for (const vehicle of form.vehicles) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
		}
	};

	const addVehicle = async () => {
		const entry = makeEmptyVehicle();
		form.vehicles = [...form.vehicles, entry];
		await tick();
		document
			.getElementById(`vehicle-block-${entry.id}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const removeVehicle = (id: string) => {
		if (form.vehicles.length <= 1) return;
		form.vehicles = form.vehicles.filter((vehicle) => vehicle.id !== id);
	};

	const onSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		errors = validateReportForm(form);
		if (!isFormValid(errors)) {
			if (errors.photos) photosCardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}

		submitting = true;
		sendError = null;
		sendResults = [];

		const photoById = new Map(form.photos.map((photo) => [photo.id, photo]));
		const results: { vehicle: VehicleEntry; ok: boolean }[] = [];

		try {
			for (const [index, vehicle] of form.vehicles.entries()) {
				const incidentTypes = city.incidentTypes.filter((t) =>
					vehicle.incidentTypeIds.includes(t.id)
				);
				const vehiclePhotos = vehicle.photoIds
					.map((id) => photoById.get(id))
					.filter((photo): photo is PhotoEntry => photo !== undefined);

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
				body.set('vehicleIndex', String(index + 1));
				body.set('vehicleTotal', String(form.vehicles.length));
				body.set('licensePlate', vehicle.licensePlate);
				for (const id of vehicle.incidentTypeIds) body.append('incidentTypeIds', id);
				body.set('notes', vehicle.notes ?? '');
				vehiclePhotos.forEach((photo, pIdx) =>
					body.append('photos', photo.blob, `beweisfoto-${pIdx + 1}.jpg`)
				);

				let ok: boolean;
				try {
					const response = await fetch('/api/send', { method: 'POST', body });
					ok = response.ok;
				} catch {
					ok = false;
				}
				results.push({ vehicle, ok });

				if (ok) {
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
						licensePlate: vehicle.licensePlate,
						notes: vehicle.notes,
						thumbnails: vehiclePhotos.map((photo) => photo.blob)
					});
				}
			}

			sendResults = results.map((r) => ({ licensePlate: r.vehicle.licensePlate, ok: r.ok }));

			const failedCount = results.filter((r) => !r.ok).length;
			if (failedCount === results.length) {
				sendError =
					'Der Versand ist fehlgeschlagen. Deine Angaben bleiben erhalten — bitte erneut versuchen.';
				return;
			}

			if (results.some((r) => r.ok)) {
				profileStore.save({
					firstName: form.firstName,
					lastName: form.lastName,
					address: form.address,
					email: form.email
				});
			}

			const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.vehicle.id));
			form.vehicles = form.vehicles.filter((vehicle) => !succeededIds.has(vehicle.id));

			if (form.vehicles.length === 0) {
				form = {
					...form,
					date: '',
					time: '',
					locationStreet: '',
					locationHouseNumber: '',
					locationPostcode: '',
					locationCity: '',
					photos: [],
					vehicles: [makeEmptyVehicle()]
				};
			}
		} finally {
			submitting = false;
		}
	};
</script>

<form onsubmit={onSubmit} class="flex flex-col gap-4">
	{#if sendError}
		<p role="alert" class="rounded-card bg-error-bg p-3 text-error-fg">{sendError}</p>
	{:else if sendResults.length > 0}
		{#if sendResults.every((r) => r.ok)}
			<p role="status" class="rounded-card bg-success-bg p-3 text-success-fg">
				{sendResults.length > 1
					? `Alle ${sendResults.length} Anzeigen erfolgreich versendet.`
					: 'Anzeige erfolgreich versendet.'}
			</p>
		{:else}
			<p role="alert" class="rounded-card bg-warning-bg p-3 text-warning-fg">
				{sendResults.filter((r) => r.ok).length} von {sendResults.length} Anzeigen erfolgreich versendet.
				Fehlgeschlagen: {sendResults
					.filter((r) => !r.ok)
					.map((r) => r.licensePlate)
					.join(', ')}. Bitte erneut auf „Absenden" klicken, um es für die verbleibenden Fahrzeuge
				erneut zu versuchen.
			</p>
		{/if}
	{/if}

	<div bind:this={photosCardElement}>
		<PhotoPool
			photos={form.photos}
			{usageCounts}
			error={errors.photos}
			processingError={photoProcessingError}
			processing={photoProcessing}
			maxPhotos={MAX_PHOTOS_PER_REPORT}
			onAdd={onAddPhoto}
			onRemove={onRemovePhoto}
		/>
	</div>

	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
		<div class="lg:w-[380px] lg:flex-shrink-0">
			<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-ink-muted uppercase">Tatort</h2>

				<div class="mt-3 grid grid-cols-2 gap-3">
					<div>
						<label for="date" class="block text-sm font-medium text-ink">Datum</label>
						<input
							id="date"
							type="date"
							bind:value={form.date}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.date}<p class="text-sm text-error-fg">{errors.date}</p>{/if}
					</div>
					<div>
						<label for="time" class="block text-sm font-medium text-ink">Uhrzeit</label>
						<input
							id="time"
							type="time"
							bind:value={form.time}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.time}<p class="text-sm text-error-fg">{errors.time}</p>{/if}
					</div>
				</div>

				<div class="mt-3 grid grid-cols-[2fr_1fr] gap-3">
					<div>
						<label for="locationStreet" class="block text-sm font-medium text-ink">Straße</label>
						<input
							id="locationStreet"
							bind:value={form.locationStreet}
							required={addressManualRequired}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.locationStreet}<p class="text-sm text-error-fg">
								{errors.locationStreet}
							</p>{/if}
					</div>
					<div>
						<label for="locationHouseNumber" class="block text-sm font-medium text-ink"
							>Hausnr.</label
						>
						<input
							id="locationHouseNumber"
							bind:value={form.locationHouseNumber}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
					</div>
				</div>
				{#if geocodeError}<p class="mt-1 text-sm text-warning-fg">{geocodeError}</p>{/if}
				<div class="mt-3 grid grid-cols-[1fr_2fr] gap-3">
					<div>
						<label for="locationPostcode" class="block text-sm font-medium text-ink">PLZ</label>
						<input
							id="locationPostcode"
							bind:value={form.locationPostcode}
							required={addressManualRequired}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.locationPostcode}<p class="text-sm text-error-fg">
								{errors.locationPostcode}
							</p>{/if}
					</div>
					<div>
						<label for="locationCity" class="block text-sm font-medium text-ink">Ort</label>
						<input
							id="locationCity"
							bind:value={form.locationCity}
							required={addressManualRequired}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.locationCity}<p class="text-sm text-error-fg">{errors.locationCity}</p>{/if}
					</div>
				</div>

				{#if form.locationStreet || form.locationCity}
					<p class="mt-3 text-sm text-ink-muted">
						{form.locationStreet}
						{form.locationHouseNumber}<br />
						{form.locationPostcode}
						{form.locationCity}
					</p>
				{/if}
			</div>
		</div>

		<div class="flex flex-1 flex-col gap-4">
			<div
				class={`grid grid-cols-1 gap-4 ${form.vehicles.length > 1 ? 'md:grid-cols-2' : ''} lg:grid-cols-1`}
			>
				{#each form.vehicles as vehicle, index (vehicle.id)}
					<div id="vehicle-block-{vehicle.id}">
						<VehicleBlock
							{vehicle}
							{index}
							total={form.vehicles.length}
							errors={errors.vehicles?.[index]}
							pool={form.photos}
							incidentTypes={city.incidentTypes}
							maxPhotos={MAX_PHOTOS_PER_REPORT}
							onRemove={() => removeVehicle(vehicle.id)}
						/>
					</div>
				{/each}
			</div>

			<button
				type="button"
				onclick={addVehicle}
				class="rounded-control border border-primary-500 px-4 py-3 font-medium text-primary-600"
			>
				+ Weiteres Fahrzeug hinzufügen
			</button>

			<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="firstName" class="block text-sm font-medium text-ink">Vorname</label>
						<input
							id="firstName"
							bind:value={form.firstName}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.firstName}<p class="text-sm text-error-fg">{errors.firstName}</p>{/if}
					</div>
					<div>
						<label for="lastName" class="block text-sm font-medium text-ink">Nachname</label>
						<input
							id="lastName"
							bind:value={form.lastName}
							class="mt-1 w-full rounded-control border border-border p-2"
						/>
						{#if errors.lastName}<p class="text-sm text-error-fg">{errors.lastName}</p>{/if}
					</div>
				</div>

				<div class="mt-3">
					<label for="address" class="block text-sm font-medium text-ink">Deine Adresse</label>
					<input
						id="address"
						bind:value={form.address}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.address}<p class="text-sm text-error-fg">{errors.address}</p>{/if}
				</div>

				<div class="mt-3">
					<label for="email" class="block text-sm font-medium text-ink">Deine E-Mail-Adresse</label>
					<input
						id="email"
						type="email"
						bind:value={form.email}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.email}<p class="text-sm text-error-fg">{errors.email}</p>{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="pb-24 lg:hidden"></div>
	<div
		class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-4 backdrop-blur-sm lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
	>
		<button
			type="submit"
			disabled={submitting || photoProcessing}
			class="mx-auto block w-full max-w-md rounded-control bg-primary-600 px-4 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50 lg:max-w-5xl"
		>
			{submitting ? 'Wird gesendet…' : 'Absenden'}
		</button>
	</div>
</form>
