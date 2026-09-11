<script lang="ts">
	import { CITIES } from '$lib/config/cities';
	import { parseExif } from '$lib/exif/parseExif';
	import { fetchAddress } from '$lib/geocode/client';
	import { formatAddress } from '$lib/geocode/formatAddress';
	import { addEntry } from '$lib/history/db';
	import { compressImage } from '$lib/image/compress';
	import { convertHeicToJpeg, isHeicFile } from '$lib/image/convertHeic';
	import { embedExifMetadata } from '$lib/image/embedExif';
	import { createProfileStore } from '$lib/profile/profileStore.svelte';
	import {
		getMaxPoolPhotos,
		isFormValid,
		MAX_PHOTOS_PER_VEHICLE,
		validateProfileFields,
		validateReportForm,
		type PhotoEntry,
		type ReportFormData,
		type VehicleEntry
	} from '$lib/validation/formSchema';
	import { tick } from 'svelte';
	import PhotoPool from './PhotoPool.svelte';
	import VehicleBlock from './VehicleBlock.svelte';

	const city = CITIES.koeln;
	const profileStore = createProfileStore();

	const makeEmptyVehicle = (): VehicleEntry => ({
		id: crypto.randomUUID(),
		photoIds: [],
		licensePlate: '',
		incidentTypeIds: [],
		notes: '',
		date: '',
		time: '',
		locationStreet: '',
		locationHouseNumber: '',
		locationPostcode: '',
		locationCity: ''
	});

	let form = $state<ReportFormData>({
		firstName: '',
		lastName: '',
		addressStreet: '',
		addressHouseNumber: '',
		addressPostcode: '',
		addressCity: '',
		email: '',
		photos: [],
		vehicles: []
	});
	let errors = $state<ReturnType<typeof validateReportForm>>({});
	let photosCardElement = $state<HTMLDivElement | undefined>(undefined);
	let photoProcessing = $state(false);
	let photoProcessingError = $state<string | null>(null);
	let vehicleGeocodeWarnings = $state<Record<string, string>>({});
	let sendError = $state<string | null>(null);
	let sendResults = $state<{ licensePlate: string; ok: boolean }[]>([]);
	let submitting = $state(false);
	let isEditingProfile = $state(true);

	$effect(() => {
		profileStore.load().then(() => {
			const profile = profileStore.value;
			if (!form.firstName) form.firstName = profile.firstName;
			if (!form.lastName) form.lastName = profile.lastName;
			if (!form.addressStreet) form.addressStreet = profile.addressStreet;
			if (!form.addressHouseNumber) form.addressHouseNumber = profile.addressHouseNumber;
			if (!form.addressPostcode) form.addressPostcode = profile.addressPostcode;
			if (!form.addressCity) form.addressCity = profile.addressCity;
			if (!form.email) form.email = profile.email;

			const profileErrors = validateProfileFields(form);
			if (Object.keys(profileErrors).length === 0) isEditingProfile = false;
		});
	});

	const saveProfileFields = async () => {
		await profileStore.save({
			firstName: form.firstName,
			lastName: form.lastName,
			addressStreet: form.addressStreet,
			addressHouseNumber: form.addressHouseNumber ?? '',
			addressPostcode: form.addressPostcode,
			addressCity: form.addressCity,
			email: form.email
		});
	};

	const onSaveProfile = async () => {
		const profileErrors = validateProfileFields(form);
		errors = { ...errors, ...profileErrors };
		if (Object.keys(profileErrors).length > 0) return;

		await saveProfileFields();
		isEditingProfile = false;
	};

	const onEditProfile = () => {
		isEditingProfile = true;
	};

	let usageCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const vehicle of form.vehicles) {
			for (const photoId of vehicle.photoIds) counts[photoId] = (counts[photoId] ?? 0) + 1;
		}
		return counts;
	});

	// Cache: löst das GPS eines Fotos per Reverse-Geocoding auf und merkt sich das Ergebnis
	// auf dem Pool-Eintrag, damit eine Mehrfachzuordnung zu Fahrzeugen keinen erneuten
	// Netzwerkaufruf auslöst.
	const resolvePhotoAddress = async (photo: PhotoEntry) => {
		if (photo.resolvedAddress !== undefined) return photo.resolvedAddress;
		if (!photo.gps) return null;
		const address = await fetchAddress(photo.gps.lat, photo.gps.lon);
		photo.resolvedAddress = address;
		return address;
	};

	// Befüllt Datum/Uhrzeit/Tatort eines Fahrzeugs aus dem EXIF eines ihm zugeordneten
	// Fotos — überschreibt nie bereits vorhandene (auch manuell eingegebene) Werte.
	const applyPhotoExifToVehicle = async (vehicle: VehicleEntry, photoId: string) => {
		const photo = form.photos.find((p) => p.id === photoId);
		if (!photo) return;

		if (photo.date) vehicle.date ||= photo.date;
		if (photo.time) vehicle.time ||= photo.time;

		if (vehicle.locationStreet.trim() && vehicle.locationCity.trim()) return;
		if (!photo.gps) return;

		const address = await resolvePhotoAddress(photo);
		if (address?.street) vehicle.locationStreet ||= address.street;
		if (address?.houseNumber) vehicle.locationHouseNumber ||= address.houseNumber;
		if (address?.postcode) vehicle.locationPostcode ||= address.postcode;
		if (address?.city) vehicle.locationCity ||= address.city;

		if (!address?.street || !address?.city) {
			vehicleGeocodeWarnings = {
				...vehicleGeocodeWarnings,
				[vehicle.id]:
					'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.'
			};
			const coordsNote = `GPS-Koordinaten des Fotos: ${photo.gps.lat}, ${photo.gps.lon}`;
			vehicle.notes = vehicle.notes ? `${vehicle.notes}\n${coordsNote}` : coordsNote;
		}
	};

	const onAddPhoto = async (file: File) => {
		photoProcessingError = null;
		const exif = await parseExif(file);

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

			const entry: PhotoEntry = {
				id: crypto.randomUUID(),
				blob: withExif,
				fileName: file.name,
				gps: exif.gps,
				date: exif.date,
				time: exif.time
			};
			form.photos = [...form.photos, entry];
			errors = { ...errors, photos: undefined };

			// Erstes Foto: legt die erste Fahrzeug-Karte an, die bis dahin nicht existiert.
			if (form.vehicles.length === 0) {
				const vehicle = makeEmptyVehicle();
				vehicle.photoIds = [entry.id];
				form.vehicles = [vehicle];
				await applyPhotoExifToVehicle(vehicle, entry.id);
			} else if (
				// Bei genau einem Fahrzeug ist die Zuordnung eindeutig — direkt automatisch übernehmen.
				form.vehicles.length === 1 &&
				form.vehicles[0].photoIds.length < MAX_PHOTOS_PER_VEHICLE
			) {
				form.vehicles[0].photoIds = [...form.vehicles[0].photoIds, entry.id];
				await applyPhotoExifToVehicle(form.vehicles[0], entry.id);
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
		await saveProfileFields();

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
				body.set('addressStreet', form.addressStreet);
				body.set('addressHouseNumber', form.addressHouseNumber ?? '');
				body.set('addressPostcode', form.addressPostcode);
				body.set('addressCity', form.addressCity);
				body.set('email', form.email);
				body.set('date', vehicle.date);
				body.set('time', vehicle.time);
				body.set('locationStreet', vehicle.locationStreet);
				body.set('locationHouseNumber', vehicle.locationHouseNumber ?? '');
				body.set('locationPostcode', vehicle.locationPostcode);
				body.set('locationCity', vehicle.locationCity);
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
							street: vehicle.locationStreet,
							houseNumber: vehicle.locationHouseNumber,
							postcode: vehicle.locationPostcode,
							city: vehicle.locationCity
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

			const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.vehicle.id));
			form.vehicles = form.vehicles.filter((vehicle) => !succeededIds.has(vehicle.id));

			if (form.vehicles.length === 0) {
				form = {
					...form,
					photos: [],
					vehicles: []
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

	<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
		<h2 class="text-sm font-semibold tracking-wide text-ink-muted uppercase">Deine Angaben</h2>

		{#if isEditingProfile}
			<div class="mt-3 grid grid-cols-2 gap-3">
				<div>
					<label for="firstName" class="block text-sm font-medium text-ink"
						>Vorname <span class="text-error-fg">*</span></label
					>
					<input
						id="firstName"
						autocomplete="given-name"
						required
						aria-required="true"
						bind:value={form.firstName}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.firstName}<p class="text-sm text-error-fg">{errors.firstName}</p>{/if}
				</div>
				<div>
					<label for="lastName" class="block text-sm font-medium text-ink"
						>Nachname <span class="text-error-fg">*</span></label
					>
					<input
						id="lastName"
						autocomplete="family-name"
						required
						aria-required="true"
						bind:value={form.lastName}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.lastName}<p class="text-sm text-error-fg">{errors.lastName}</p>{/if}
				</div>
			</div>

			<div class="mt-3 grid grid-cols-[2fr_1fr] gap-3">
				<div>
					<label for="addressStreet" class="block text-sm font-medium text-ink"
						>Straße <span class="text-error-fg">*</span></label
					>
					<input
						id="addressStreet"
						autocomplete="address-line1"
						required
						aria-required="true"
						bind:value={form.addressStreet}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.addressStreet}<p class="text-sm text-error-fg">{errors.addressStreet}</p>{/if}
				</div>
				<div>
					<label for="addressHouseNumber" class="block text-sm font-medium text-ink">Hausnr.</label>
					<input
						id="addressHouseNumber"
						autocomplete="address-line2"
						bind:value={form.addressHouseNumber}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
				</div>
			</div>

			<div class="mt-3 grid grid-cols-[1fr_2fr] gap-3">
				<div>
					<label for="addressPostcode" class="block text-sm font-medium text-ink"
						>PLZ <span class="text-error-fg">*</span></label
					>
					<input
						id="addressPostcode"
						autocomplete="postal-code"
						required
						aria-required="true"
						bind:value={form.addressPostcode}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.addressPostcode}<p class="text-sm text-error-fg">
							{errors.addressPostcode}
						</p>{/if}
				</div>
				<div>
					<label for="addressCity" class="block text-sm font-medium text-ink"
						>Ort <span class="text-error-fg">*</span></label
					>
					<input
						id="addressCity"
						autocomplete="address-level2"
						required
						aria-required="true"
						bind:value={form.addressCity}
						onblur={saveProfileFields}
						class="mt-1 w-full rounded-control border border-border p-2"
					/>
					{#if errors.addressCity}<p class="text-sm text-error-fg">{errors.addressCity}</p>{/if}
				</div>
			</div>

			<div class="mt-3">
				<label for="email" class="block text-sm font-medium text-ink"
					>Deine E-Mail-Adresse <span class="text-error-fg">*</span></label
				>
				<input
					id="email"
					type="email"
					autocomplete="email"
					required
					aria-required="true"
					bind:value={form.email}
					onblur={saveProfileFields}
					class="mt-1 w-full rounded-control border border-border p-2"
				/>
				{#if errors.email}<p class="text-sm text-error-fg">{errors.email}</p>{/if}
			</div>

			<button
				type="button"
				onclick={onSaveProfile}
				class="mt-4 rounded-control border border-primary-500 px-3 py-1.5 text-sm font-medium text-primary-600"
			>
				Speichern
			</button>
		{:else}
			<div class="mt-3 text-sm text-ink">
				<p>{form.firstName} {form.lastName}</p>
				<p>{form.addressStreet} {form.addressHouseNumber}</p>
				<p>{form.addressPostcode} {form.addressCity}</p>
				<p>{form.email}</p>
			</div>

			<button
				type="button"
				onclick={onEditProfile}
				class="mt-4 rounded-control border border-primary-500 px-3 py-1.5 text-sm font-medium text-primary-600"
			>
				Bearbeiten
			</button>
		{/if}
	</div>

	<div bind:this={photosCardElement}>
		<PhotoPool
			photos={form.photos}
			{usageCounts}
			error={errors.photos}
			processingError={photoProcessingError}
			processing={photoProcessing}
			maxPhotos={getMaxPoolPhotos(form.vehicles.length)}
			maxPhotosPerVehicle={MAX_PHOTOS_PER_VEHICLE}
			onAdd={onAddPhoto}
			onRemove={onRemovePhoto}
		/>
	</div>

	<div class="flex flex-col gap-4">
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
						maxPhotos={MAX_PHOTOS_PER_VEHICLE}
						geocodeWarning={vehicleGeocodeWarnings[vehicle.id]}
						onRemove={() => removeVehicle(vehicle.id)}
						onPhotoToggled={(photoId, selected) => {
							if (selected) applyPhotoExifToVehicle(vehicle, photoId);
						}}
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
